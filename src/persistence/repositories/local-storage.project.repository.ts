import Project from "@/schemas/project/project.schema";
import {
	deserializeProject,
	deserializeProjects,
} from "../project-deserialization";
import { ensureLocalStorageLayout } from "../migrations/local-storage";
import {
	PROJECTS_INDEX_KEY,
	ProjectIndex,
	projectKey,
} from "../migrations/local-storage/keys";
import { classifyStorageWriteError } from "../storage-write-error";
import ProjectRepository, {
	ProjectListResult,
	SaveResult,
} from "./project.repository";

/**
 * Stockage des projets dans le `localStorage` du navigateur.
 *
 * **La disposition du stockage est une affaire interne à ce repository** — mais elle est
 * versionnée (`../migrations/local-storage/`), car un projet peut devenir gros et une clé unique
 * pour tous les projets faisait payer chaque `save`/`get`/`delete` du poids de tous les autres.
 *
 * Disposition v1 : une clé `studomate_project_<id>` par projet, plus un index `{ id, name }` sous
 * `studomate_projects_data`. `ensureLocalStorageLayout()` migre depuis la v0 (tableau unique) à
 * la première opération. Tant que la migration n'a pas abouti (quota), le repository reste
 * fonctionnel en lisant/écrivant l'ancienne disposition.
 *
 * Ce qui reste porté par le projet lui-même, et non par la disposition, c'est la **forme d'un
 * projet** (`schemaVersion`) — partagée par tous les supports.
 *
 * Chaque méthode est `async` bien que le stockage soit synchrone : simule la latence d'un futur
 * backend distant sans lui, pour que l'interface `ProjectRepository` — et l'indicateur
 * `savingProject` qui en dépend — n'ait pas à changer.
 */
export default class LocalStorageProjectRepository implements ProjectRepository {
	private layoutVersion: number | null = null;

	/** Migre la disposition une fois par instance, et retient la version effective. */
	private ensureLayout(): number {
		if (this.layoutVersion === null) {
			this.layoutVersion = ensureLocalStorageLayout();
		}
		return this.layoutVersion;
	}

	async list(): Promise<ProjectListResult> {
		return deserializeProjects(this.readRawProjects());
	}

	async get(projectId: string): Promise<Project | null> {
		const raw =
			this.ensureLayout() >= 1
				? this.readRawProject(projectId)
				: (this.readLegacyProjects().find((p) => p?.id === projectId) ?? null);
		if (!raw) return null;
		const result = deserializeProject(raw);
		return result.ok ? result.project : null;
	}

	// `location` (voir `ProjectRepository`) est sans objet ici : ce repository ne connaît qu'un
	// seul lieu de stockage.
	async save(project: Project): Promise<SaveResult> {
		//Une copie de surface suffit à détacher le prototype de classe avant `JSON.stringify`.
		const serialized = { ...project };

		if (this.ensureLayout() >= 1) {
			const projectWrite = this.writeKey(projectKey(project.id), serialized);
			if (!projectWrite.ok) return projectWrite;
			const index = this.readIndex();
			index[project.id] = { name: project.name };
			//Si l'index échoue après l'écriture du projet, le projet est écrit mais absent de la
			//liste ; l'échec est remonté et un ré-enregistrement (idempotent) le rattrapera.
			return this.writeKey(PROJECTS_INDEX_KEY, index);
		}

		const raws = this.readLegacyProjects();
		const index = raws.findIndex((p) => p?.id === project.id);
		if (index === -1) raws.push(serialized);
		else raws[index] = serialized;
		return this.writeKey(PROJECTS_INDEX_KEY, raws);
	}

	async delete(projectId: string): Promise<SaveResult> {
		if (this.ensureLayout() >= 1) {
			try {
				localStorage.removeItem(projectKey(projectId));
			} catch (e) {
				console.error(`Clé du projet "${projectId}" non supprimée :`, e);
			}
			const index = this.readIndex();
			delete index[projectId];
			return this.writeKey(PROJECTS_INDEX_KEY, index);
		}
		return this.writeKey(
			PROJECTS_INDEX_KEY,
			this.readLegacyProjects().filter((p) => p?.id !== projectId),
		);
	}

	private readRawProjects(): Record<string, any>[] {
		if (this.ensureLayout() >= 1) {
			return Object.keys(this.readIndex())
				.map((id) => this.readRawProject(id))
				.filter((p): p is Record<string, any> => p !== null);
		}
		return this.readLegacyProjects();
	}

	private readRawProject(id: string): Record<string, any> | null {
		try {
			const raw = localStorage.getItem(projectKey(id));
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			return parsed && typeof parsed === "object" ? parsed : null;
		} catch (e) {
			console.error(`Projet "${id}" illisible, ignoré :`, e);
			return null;
		}
	}

	private readIndex(): ProjectIndex {
		try {
			const raw = localStorage.getItem(PROJECTS_INDEX_KEY);
			const parsed = raw ? JSON.parse(raw) : {};
			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
				return {};
			}
			return parsed as ProjectIndex;
		} catch {
			return {};
		}
	}

	/**
	 * Lit le tableau unique de la disposition v0, en absorbant l'ancien format où chaque entrée
	 * était elle-même une chaîne JSON (double échappement). N'est utilisé que tant que la
	 * migration v0 → v1 n'a pas abouti.
	 */
	private readLegacyProjects(): Record<string, any>[] {
		let parsed: unknown;
		try {
			const raw = localStorage.getItem(PROJECTS_INDEX_KEY);
			if (!raw) return [];
			parsed = JSON.parse(raw);
		} catch (e) {
			console.error("Stockage des projets illisible :", e);
			return [];
		}
		if (!Array.isArray(parsed)) return [];

		return parsed
			.map((entry) => {
				if (typeof entry !== "string") return entry;
				try {
					return JSON.parse(entry);
				} catch {
					console.error("Projet illisible écarté");
					return null;
				}
			})
			.filter((p): p is Record<string, any> => !!p && typeof p === "object");
	}

	private writeKey(key: string, value: unknown): SaveResult {
		try {
			localStorage.setItem(key, JSON.stringify(value));
			return { ok: true };
		} catch (e) {
			return { ok: false, reason: classifyStorageWriteError(e), cause: e };
		}
	}
}
