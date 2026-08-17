import Project from "@/schemas/project/project.schema";
import { deserializeProject } from "../project-deserialization";
import { supabase } from "./supabase-client";
import ProjectRepository, { SaveFailureReason, SaveResult } from "./project.repository";

const TABLE = "projects";

/**
 * Stockage des projets dans Supabase (table `projects`, colonne `data` en jsonb).
 *
 * Le RLS de la table filtre déjà par utilisateur connecté (`auth.uid() = owner_id`) : ce
 * repository ne fait donc jamais de filtrage explicite par utilisateur dans ses requêtes.
 *
 * Comme `LocalStorageProjectRepository`, le projet est stocké tel quel (JSON versionné) et
 * migré à la lecture — jamais en base, cf. `deserializeProject`.
 */
export default class SupabaseProjectRepository implements ProjectRepository {
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
		const { data, error } = await supabase.from(TABLE).select("data").eq("id", projectId).maybeSingle();
		if (error || !data) return null;
		return deserializeProject(data.data as Record<string, any>);
	}

	async save(project: Project): Promise<SaveResult> {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return { ok: false, reason: "network" };

		const serialized = JSON.parse(JSON.stringify(project));
		const { error } = await supabase.from(TABLE).upsert({
			id: project.id,
			owner_id: user.id,
			data: serialized,
			updated_at: new Date().toISOString(),
		});
		if (error) return { ok: false, reason: this.failureReason(error), cause: error };
		return { ok: true };
	}

	async delete(projectId: string): Promise<SaveResult> {
		const { error } = await supabase.from(TABLE).delete().eq("id", projectId);
		if (error) return { ok: false, reason: this.failureReason(error), cause: error };
		return { ok: true };
	}

	private failureReason(_error: unknown): SaveFailureReason {
		return "network";
	}
}
