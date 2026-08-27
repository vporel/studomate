import Project from "@/schemas/project/project.schema";
import LocalStorageProjectRepository from "./local-storage.project.repository";
import SupabaseProjectRepository from "./supabase.project.repository";
import { isSupabaseConfigured, supabase } from "./supabase-client";
import ProjectRepository, { SaveResult } from "./project.repository";

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
export default class HybridProjectRepository implements ProjectRepository {
	private readonly local = new LocalStorageProjectRepository();
	private readonly cloud = new SupabaseProjectRepository();

	async list(): Promise<Project[]> {
		const localProjects = await this.local.list();
		if (!(await this.isAuthenticated())) return localProjects;
		// Un projet présent dans l'index cloud n'est plus local, même si `local.list()` le renvoie
		// encore (nettoyage local incomplet après un `moveToCloud` — voir plus bas).
		const localOnly = localProjects.filter((p) => !this.isCloud(p.id));
		return [...localOnly, ...(await this.cloud.list())];
	}

	async get(projectId: string): Promise<Project | null> {
		if (this.isCloud(projectId)) return this.cloud.get(projectId);
		return this.local.get(projectId);
	}

	async save(project: Project): Promise<SaveResult> {
		if (this.isCloud(project.id)) return this.cloud.save(project);
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
		try {
			const raw = localStorage.getItem(CLOUD_INDEX_KEY);
			const parsed = raw ? JSON.parse(raw) : [];
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
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
