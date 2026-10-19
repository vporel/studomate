import Project from "@/schemas/project/project.schema";
import { setProjectEverSaved } from "../preferences.storage";
import { readJson } from "../safe-local-storage";
import LocalStorageProjectRepository from "./local-storage.project.repository";
import SupabaseProjectRepository from "./supabase.project.repository";
import { isSupabaseConfigured, supabase } from "./supabase-client";
import ProjectRepository, {
	ProjectListResult,
	SaveResult,
	ShareableProjectRepository,
	ShareResult,
	StorageLocation,
} from "./project.repository";

const CLOUD_INDEX_KEY = "studomate_cloud_project_ids";

/**
 * Combine stockage local et stockage cloud (Supabase) : chaque projet vit **soit** en local
 * **soit** dans le cloud, jamais les deux à la fois.
 *
 * L'appartenance de chaque projet à l'un ou l'autre est une pure question de disposition du
 * stockage — au même titre que la clé `localStorage` utilisée par `LocalStorageProjectRepository`
 * — donc gardée ici, dans un petit index local, jamais comme un champ du `Project` lui-même.
 * Un projet absent de l'index est considéré local : c'est le comportement par défaut pour un
 * nouveau projet, inchangé par rapport à avant l'ajout du cloud.
 */
export default class HybridProjectRepository
	implements ProjectRepository, ShareableProjectRepository
{
	private readonly local = new LocalStorageProjectRepository();
	private readonly cloud = new SupabaseProjectRepository();

	async list(): Promise<ProjectListResult> {
		const local = await this.local.list();
		if (!(await this.isAuthenticated())) return local;
		const indexBeforeListing = this.readIndex();
		const cloud = await this.cloud.list();
		if (!cloud.failed) this.pruneIndex(indexBeforeListing, cloud);
		// Le serveur fait foi : un projet cloud absent de l'index (créé depuis un autre navigateur,
		// stockage local vidé...) y est inscrit, sinon il serait rangé et enregistré comme local.
		// Un id qui existe aussi en local reste ambigu : l'index n'est pas modifié pour lui.
		const localIds = new Set(local.projects.map((p) => p.id));
		for (const project of cloud.projects) {
			if (!localIds.has(project.id)) this.addToIndex(project.id);
		}
		// Un projet présent dans l'index cloud n'est plus local, même si `local.list()` le renvoie
		// encore (nettoyage local incomplet après un `moveToCloud` — voir plus bas).
		const localOnly = local.projects.filter((p) => !this.isCloud(p.id));
		// Conversely, a project the index places locally is listed once, from the local copy, even
		// if the cloud still returns it (incomplete cloud cleanup after a `moveToLocal`).
		const localOnlyIds = new Set(localOnly.map((p) => p.id));
		const cloudOnly = cloud.projects.filter((p) => !localOnlyIds.has(p.id));
		return {
			projects: [...localOnly, ...cloudOnly],
			skipped: [...local.skipped, ...cloud.skipped],
			...(cloud.failed && { failed: true }),
		};
	}

	/**
	 * Removes from the index the ids that the account's cloud no longer holds (deleted from another
	 * device, or projects of another account). Only ids indexed before the listing started are
	 * candidates, so a project moved to the cloud while the listing was in flight stays indexed.
	 * A skipped cloud project without a readable id could be any of them: nothing is removed then.
	 */
	private pruneIndex(candidates: string[], cloud: ProjectListResult) {
		if (cloud.skipped.some((s) => s.id === null)) return;
		const cloudIds = new Set([
			...cloud.projects.map((p) => p.id),
			...cloud.skipped.map((s) => s.id),
		]);
		const stale = new Set(candidates.filter((id) => !cloudIds.has(id)));
		if (stale.size === 0) return;
		this.writeIndex(this.readIndex().filter((id) => !stale.has(id)));
	}

	async get(projectId: string): Promise<Project | null> {
		if (this.isCloud(projectId)) return this.cloud.get(projectId);
		return this.local.get(projectId);
	}

	/**
	 * `location` ne joue que pour un id encore inconnu de cet index : un projet déjà local ou
	 * déjà cloud garde son emplacement, quel que soit `location` — seul le premier enregistrement
	 * d'un projet peut choisir sa destination.
	 */
	async save(
		project: Project,
		location?: StorageLocation,
	): Promise<SaveResult> {
		const result = await this.saveTo(project, location);
		if (result.ok) setProjectEverSaved();
		return result;
	}

	private async saveTo(
		project: Project,
		location?: StorageLocation,
	): Promise<SaveResult> {
		if (this.isCloud(project.id)) return this.cloud.save(project);
		// `isCloud` à false ne veut pas dire "projet neuf" : il peut déjà exister en local, auquel
		// cas `location` ne doit rien changer — seul un id absent des deux repositories est
		// réellement neuf et peut choisir sa destination.
		if (location === "cloud" && !(await this.local.get(project.id))) {
			return this.moveToCloud(project);
		}
		return this.local.save(project);
	}

	async delete(projectId: string): Promise<SaveResult> {
		const result = this.isCloud(projectId)
			? await this.cloud.delete(projectId)
			: await this.local.delete(projectId);
		if (result.ok) this.removeFromIndex(projectId);
		return result;
	}

	locationOf(projectId: string): "local" | "cloud" {
		return this.isCloud(projectId) ? "cloud" : "local";
	}

	/**
	 * Déplace un projet local vers le cloud. Ne touche pas au local si l'envoi échoue, ni si
	 * l'index ne peut pas être mis à jour : sans cette garde, la copie locale serait supprimée
	 * alors que l'index croit encore le projet local → `get` irait chercher dans un local vide.
	 */
	async moveToCloud(project: Project): Promise<SaveResult> {
		const result = await this.cloud.save(project);
		if (!result.ok) return result;
		if (!this.addToIndex(project.id))
			return { ok: false, reason: "unavailable" };
		this.warnIfCleanupFailed(
			await this.local.delete(project.id),
			project.id,
			"locale",
		);
		return result;
	}

	/**
	 * Déplace un projet cloud vers le local. Ne touche pas au cloud si l'écriture locale échoue,
	 * ni si l'index ne peut pas être mis à jour (voir `moveToCloud`).
	 */
	async moveToLocal(project: Project): Promise<SaveResult> {
		const result = await this.local.save(project);
		if (!result.ok) return result;
		if (!this.removeFromIndex(project.id))
			return { ok: false, reason: "unavailable" };
		this.warnIfCleanupFailed(
			await this.cloud.delete(project.id),
			project.id,
			"cloud",
		);
		return result;
	}

	/**
	 * Projets stockés dans le cloud du compte connecté ; vide sans session. Une copie cloud d'un
	 * projet que l'index range en local est périmée (nettoyage cloud incomplet après un
	 * `moveToLocal`) : elle est écartée, la copie locale fait foi.
	 */
	async listCloud(): Promise<ProjectListResult> {
		if (!(await this.isAuthenticated())) return { projects: [], skipped: [] };
		const [cloud, local] = await Promise.all([
			this.cloud.list(),
			this.local.list(),
		]);
		const localIds = new Set(local.projects.map((p) => p.id));
		return {
			...cloud,
			projects: cloud.projects.filter(
				(p) => this.isCloud(p.id) || !localIds.has(p.id),
			),
		};
	}

	/**
	 * Rapatrie tous les projets cloud en local, en s'arrêtant au premier échec (les projets déjà
	 * déplacés restent en local, les autres restent dans le cloud). Un cloud illisible est un
	 * échec : l'appelant ne doit pas croire le cloud vide.
	 */
	async moveAllCloudToLocal(): Promise<SaveResult> {
		const { projects, failed } = await this.listCloud();
		if (failed) return { ok: false, reason: "network" };
		for (const project of projects) {
			const result = await this.moveToLocal(project);
			if (!result.ok) return result;
		}
		return { ok: true };
	}

	// Le partage n'existe que pour les projets cloud : le token porte sur une ligne `project_id`
	// de la base. L'appelant vérifie `locationOf` avant d'appeler `createShareToken`.
	getByShareToken(token: string): Promise<Project | null> {
		return this.cloud.getByShareToken(token);
	}

	getShareToken(projectId: string): Promise<string | null> {
		return this.cloud.getShareToken(projectId);
	}

	createShareToken(projectId: string): Promise<ShareResult> {
		return this.cloud.createShareToken(projectId);
	}

	deleteShareToken(projectId: string): Promise<SaveResult> {
		return this.cloud.deleteShareToken(projectId);
	}

	/**
	 * Le déplacement a réussi (données à destination + index à jour) mais l'ancienne copie n'a pas
	 * pu être supprimée. `list()` la masque déjà via l'index ; on signale pour le diagnostic.
	 */
	private warnIfCleanupFailed(
		result: SaveResult,
		projectId: string,
		source: "locale" | "cloud",
	) {
		if (!result.ok) {
			console.warn(
				`Copie ${source} du projet "${projectId}" non supprimée après déplacement :`,
				result.reason,
			);
		}
	}

	private async isAuthenticated(): Promise<boolean> {
		if (!isSupabaseConfigured) return false;
		const {
			data: { session },
		} = await supabase.auth.getSession();
		return session !== null;
	}

	private isCloud(projectId: string): boolean {
		return this.readIndex().includes(projectId);
	}

	private addToIndex(projectId: string): boolean {
		const ids = this.readIndex();
		if (ids.includes(projectId)) return true;
		return this.writeIndex([...ids, projectId]);
	}

	private removeFromIndex(projectId: string): boolean {
		return this.writeIndex(this.readIndex().filter((id) => id !== projectId));
	}

	private readIndex(): string[] {
		const parsed = readJson(CLOUD_INDEX_KEY);
		return Array.isArray(parsed) ? parsed : [];
	}

	private writeIndex(ids: string[]): boolean {
		try {
			localStorage.setItem(CLOUD_INDEX_KEY, JSON.stringify(ids));
			return true;
		} catch (e) {
			console.error(
				"Impossible de mettre à jour l'index des projets cloud :",
				e,
			);
			return false;
		}
	}
}
