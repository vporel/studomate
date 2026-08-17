import Project from "@/schemas/project/project.schema";
import LocalStorageProjectRepository from "./local-storage.project.repository";
import SupabaseProjectRepository from "./supabase.project.repository";
import { supabase } from "./supabase-client";
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
		return [...localProjects, ...(await this.cloud.list())];
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
		const result = this.isCloud(projectId) ? await this.cloud.delete(projectId) : await this.local.delete(projectId);
		if (result.ok) this.removeFromIndex(projectId);
		return result;
	}

	locationOf(projectId: string): "local" | "cloud" {
		return this.isCloud(projectId) ? "cloud" : "local";
	}

	/** Déplace un projet local vers le cloud. Ne touche pas au local si l'envoi échoue. */
	async moveToCloud(project: Project): Promise<SaveResult> {
		const result = await this.cloud.save(project);
		if (!result.ok) return result;
		this.addToIndex(project.id);
		await this.local.delete(project.id);
		return result;
	}

	/** Déplace un projet cloud vers le local. Ne touche pas au cloud si l'écriture locale échoue. */
	async moveToLocal(project: Project): Promise<SaveResult> {
		const result = await this.local.save(project);
		if (!result.ok) return result;
		this.removeFromIndex(project.id);
		await this.cloud.delete(project.id);
		return result;
	}

	private async isAuthenticated(): Promise<boolean> {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		return session !== null;
	}

	private isCloud(projectId: string): boolean {
		return this.readIndex().includes(projectId);
	}

	private addToIndex(projectId: string) {
		const ids = this.readIndex();
		if (!ids.includes(projectId)) this.writeIndex([...ids, projectId]);
	}

	private removeFromIndex(projectId: string) {
		this.writeIndex(this.readIndex().filter((id) => id !== projectId));
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

	private writeIndex(ids: string[]) {
		try {
			localStorage.setItem(CLOUD_INDEX_KEY, JSON.stringify(ids));
		} catch (e) {
			console.error("Impossible de mettre à jour l'index des projets cloud :", e);
		}
	}
}
