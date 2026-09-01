import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import { deserializeProject } from "../project-deserialization";
import { supabase } from "./supabase-client";
import ProjectRepository, {
	SaveFailureReason,
	SaveResult,
	ShareableProjectRepository,
	ShareResult,
} from "./project.repository";

const TABLE = "projects";
const SHARES_TABLE = "project_shares";

/**
 * Stockage des projets dans Supabase (table `projects`, colonne `data` en jsonb).
 *
 * Le RLS de la table filtre déjà par utilisateur connecté (`auth.uid() = owner_id`) : ce
 * repository ne fait donc jamais de filtrage explicite par utilisateur dans ses requêtes.
 *
 * Comme `LocalStorageProjectRepository`, le projet est stocké tel quel (JSON versionné) et
 * migré à la lecture — jamais en base, cf. `deserializeProject`.
 *
 * **Concurrence optimiste.** La colonne `version` de la table détecte qu'un autre appareil a
 * modifié le projet entre son chargement ici et l'enregistrement en cours — un problème propre
 * au stockage cloud, donc absent du schéma `Project` (voir `versions`, ci-dessous) et non exposé
 * dans `ProjectRepository`. `versions` retient, par projet, la dernière version lue ou écrite par
 * cette instance ; `save` s'en sert comme condition d'écriture (`update ... where version = ...`)
 * et échoue avec `reason: "conflict"` si aucune ligne ne correspond, plutôt que d'écraser une
 * modification distante plus récente.
 *
 * Cette instance n'ayant jamais lu la ligne d'un projet donné n'implique pas que la ligne
 * n'existe pas côté serveur (ex. un autre appareil a déjà envoyé ce projet dans le cloud, sans
 * que cet appareil-ci le sache). `save` insère donc (`insert`, pas `upsert`) dans ce cas : une
 * violation de clé primaire remonte alors comme `reason: "conflict"` au lieu d'écraser en
 * silence une ligne dont l'existence était insoupçonnée.
 */
export default class SupabaseProjectRepository
	implements ProjectRepository, ShareableProjectRepository
{
	private readonly versions = new Map<string, number>();

	async list(): Promise<Project[]> {
		const { data, error } = await supabase.from(TABLE).select("data");
		if (error) {
			console.error("Impossible de lister les projets cloud :", error);
			return [];
		}
		return (data ?? [])
			.map((row) => deserializeProject(row.data as Record<string, any>))
			.filter((p): p is Project => p !== null);
	}

	async get(projectId: string): Promise<Project | null> {
		const { data, error } = await supabase
			.from(TABLE)
			.select("data, version")
			.eq("id", projectId)
			.maybeSingle();
		if (error || !data) return null;
		this.versions.set(projectId, data.version as number);
		return deserializeProject(data.data as Record<string, any>);
	}

	// `location` (voir `ProjectRepository`) est sans objet ici : ce repository ne connaît qu'un
	// seul lieu de stockage.
	async save(project: Project): Promise<SaveResult> {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return { ok: false, reason: "network" };

		const serialized = JSON.parse(JSON.stringify(project));
		const baseVersion = this.versions.get(project.id);

		// Jamais lu (ou écrit) par cette instance : à sa connaissance, premier enregistrement de
		// ce projet dans le cloud. `insert` (pas `upsert`) pour qu'une ligne déjà existante — écrite
		// par un autre appareil à l'insu de celui-ci — échoue en conflit plutôt que d'être écrasée.
		if (baseVersion === undefined) {
			const { error } = await supabase.from(TABLE).insert({
				id: project.id,
				owner_id: user.id,
				data: serialized,
				version: 1,
				updated_at: new Date().toISOString(),
			});
			if (error)
				return { ok: false, reason: this.failureReason(error), cause: error };
			this.versions.set(project.id, 1);
			return { ok: true };
		}

		const { data, error } = await supabase
			.from(TABLE)
			.update({
				data: serialized,
				version: baseVersion + 1,
				updated_at: new Date().toISOString(),
			})
			.eq("id", project.id)
			.eq("version", baseVersion)
			.select("version");
		if (error)
			return { ok: false, reason: this.failureReason(error), cause: error };
		// Aucune ligne ne correspondait à `baseVersion` : un autre appareil a déjà incrémenté la
		// version depuis notre dernière lecture.
		if (!data || data.length === 0) return { ok: false, reason: "conflict" };
		this.versions.set(project.id, baseVersion + 1);
		return { ok: true };
	}

	async delete(projectId: string): Promise<SaveResult> {
		const { error } = await supabase.from(TABLE).delete().eq("id", projectId);
		if (error)
			return { ok: false, reason: this.failureReason(error), cause: error };
		this.versions.delete(projectId);
		return { ok: true };
	}

	async getByShareToken(token: string): Promise<Project | null> {
		const { data, error } = await supabase
			.from(SHARES_TABLE)
			.select("project_id")
			.eq("token", token)
			.maybeSingle();
		if (error || !data) return null;
		return this.get(data.project_id as string);
	}

	async getShareToken(projectId: string): Promise<string | null> {
		const { data, error } = await supabase
			.from(SHARES_TABLE)
			.select("token")
			.eq("project_id", projectId)
			.maybeSingle();
		if (error || !data) return null;
		return data.token as string;
	}

	async createShareToken(projectId: string): Promise<ShareResult> {
		const token = createRandomId();
		const { error } = await supabase
			.from(SHARES_TABLE)
			.insert({ token, project_id: projectId });
		if (error)
			return { ok: false, message: "Impossible de créer le lien de partage." };
		return { ok: true, token };
	}

	async deleteShareToken(projectId: string): Promise<SaveResult> {
		const { error } = await supabase
			.from(SHARES_TABLE)
			.delete()
			.eq("project_id", projectId);
		if (error) return { ok: false, reason: "network", cause: error };
		return { ok: true };
	}

	private failureReason(error: unknown): SaveFailureReason {
		// Code Postgres de violation de contrainte unique (ici, la clé primaire `id`) : la ligne
		// existe déjà, écrite par un appareil dont celui-ci ignorait l'existence.
		if ((error as { code?: string } | null)?.code === "23505") return "conflict";
		return "network";
	}
}
