import Project from "@/schemas/project/project.schema";
import { isFromNewerVersion, migrateProject } from "../migrations";
import ProjectRepository, { SaveFailureReason, SaveResult } from "./project.repository";

const STORAGE_KEY = "studomate_projects_data";

/**
 * Stockage des projets dans le `localStorage` du navigateur.
 *
 * **La disposition du stockage est une affaire interne à ce repository** : la clé utilisée, la
 * façon dont les projets y sont rangés, tout cela ne quitte jamais cette classe et n'a donc
 * pas à être versionné. Une implémentation base de données répondrait à ces questions
 * autrement, sans que rien d'autre ne change.
 *
 * Ce qui est versionné, en revanche, c'est la **forme d'un projet** — et cette version est
 * portée par le projet lui-même, donc partagée par tous les supports.
 *
 * **Une seule clé pour tous les projets, volontairement.** Studomate est un outil pédagogique :
 * peu de projets par utilisateur, chacun de petite taille (un grafcet tient en quelques Ko de
 * JSON). Une clé par projet résoudrait un problème de passage à l'échelle que ce
 * contexte n'a pas. Si ça change (gros volumes, sauvegarde cloud...), c'est cette classe seule
 * qu'il faudra remplacer — voir la remarque sur la disposition du stockage ci-dessus.
 */
export default class LocalStorageProjectRepository implements ProjectRepository {
	list(): Project[] {
		return this.readRawProjects()
			.map((raw) => this.toProject(raw))
			.filter((p): p is Project => p !== null);
	}

	get(projectId: string): Project | null {
		return this.list().find((p) => p.id === projectId) ?? null;
	}

	save(project: Project): SaveResult {
		const raws = this.readRawProjects();
		const serialized = JSON.parse(JSON.stringify(project));
		const index = raws.findIndex((p) => p?.id === project.id);
		if (index === -1) raws.push(serialized);
		else raws[index] = serialized;
		return this.write(raws);
	}

	delete(projectId: string): SaveResult {
		return this.write(this.readRawProjects().filter((p) => p?.id !== projectId));
	}

	/**
	 * Lit les projets bruts, en absorbant l'ancienne disposition.
	 *
	 * La toute première version rangeait un tableau JSON dont les *entrées étaient elles-mêmes
	 * des chaînes JSON*, ce qui doublait l'échappement. C'est une question de rangement, pas de
	 * forme de projet : elle se règle donc ici, sans migration.
	 */
	private readRawProjects(): Record<string, any>[] {
		let parsed: unknown;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
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
					//Une entrée illisible est écartée : perdre un projet est grave, les perdre
					//tous l'est davantage
					console.error("Projet illisible écarté");
					return null;
				}
			})
			.filter((p): p is Record<string, any> => !!p && typeof p === "object");
	}

	private write(raws: Record<string, any>[]): SaveResult {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(raws));
			return { ok: true };
		} catch (e) {
			return { ok: false, reason: this.failureReason(e), cause: e };
		}
	}

	private failureReason(e: unknown): SaveFailureReason {
		if (typeof DOMException !== "undefined" && e instanceof DOMException) {
			//Firefox et Chrome ne s'accordent pas sur le nom, et Chrome utilise le code 22
			if (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22) {
				return "quota-exceeded";
			}
		}
		if (typeof localStorage === "undefined") return "unavailable";
		return "unknown";
	}

	/**
	 * Reconstruit un projet, en migrant sa forme si besoin et en refusant ce qui n'est pas
	 * lisible plutôt que de produire un objet incohérent.
	 */
	private toProject(raw: Record<string, any>): Project | null {
		if (typeof raw.id !== "string" || raw.id === "") {
			console.error("Projet sans identifiant valide ignoré");
			return null;
		}
		if (isFromNewerVersion(raw)) {
			//Laissé intact : une version ancienne ne doit pas réécrire ce qu'elle ne comprend pas
			console.warn(`Projet "${raw.id}" enregistré par une version plus récente, ignoré`);
			return null;
		}
		try {
			const { project } = migrateProject(raw);
			return Project.createFromJSON(JSON.stringify(project));
		} catch (e) {
			console.error(`Projet "${raw.id}" illisible, ignoré :`, e);
			return null;
		}
	}
}
