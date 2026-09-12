import Project from "@/schemas/project/project.schema";
import { isFromNewerVersion, migrateProject } from "./migrations/schema";

/**
 * Raison pour laquelle une forme brute n'a pas pu être reconstruite en projet :
 * - `invalid-id`     : pas d'identifiant exploitable, l'entrée n'est probablement pas un projet
 * - `newer-version`  : enregistré par une version plus récente de l'app — laissé intact
 * - `unreadable`     : migration ou parse en échec
 */
export type DeserializationFailureReason =
	| "invalid-id"
	| "newer-version"
	| "unreadable";

export type DeserializationResult =
	| { ok: true; project: Project }
	| { ok: false; reason: DeserializationFailureReason; id: string | null };

/** Une entrée écartée par `deserializeProjects`, pour signalement côté UI. */
export type SkippedProjectInfo = {
	reason: DeserializationFailureReason;
	id: string | null;
};

/**
 * Reconstruit un projet à partir de sa forme brute (telle que lue d'un repository), en le
 * migrant si besoin et en refusant ce qui n'est pas lisible plutôt que de produire un objet
 * incohérent.
 *
 * Partagé entre tous les repositories : la migration ne dépend que de la forme du projet,
 * jamais du support qui l'a stocké.
 */
export function deserializeProject(
	raw: Record<string, any>,
): DeserializationResult {
	const id = typeof raw.id === "string" && raw.id !== "" ? raw.id : null;
	if (id === null) {
		console.error("Projet sans identifiant valide ignoré");
		return { ok: false, reason: "invalid-id", id: null };
	}
	if (isFromNewerVersion(raw)) {
		//Laissé intact : une version ancienne ne doit pas réécrire ce qu'elle ne comprend pas
		console.warn(
			`Projet "${id}" enregistré par une version plus récente, ignoré`,
		);
		return { ok: false, reason: "newer-version", id };
	}
	try {
		const { project } = migrateProject(raw);
		return { ok: true, project: Project.createFromJSON(JSON.stringify(project)) };
	} catch (e) {
		console.error(`Projet "${id}" illisible, ignoré :`, e);
		return { ok: false, reason: "unreadable", id };
	}
}

/**
 * Reconstruit une liste de projets à partir de leurs formes brutes, en séparant ceux qui
 * n'ont pas pu être lus : l'appelant peut ainsi signaler une liste amputée plutôt que de
 * faire disparaître des projets sans un mot.
 */
export function deserializeProjects(raws: Record<string, any>[]): {
	projects: Project[];
	skipped: SkippedProjectInfo[];
} {
	const projects: Project[] = [];
	const skipped: SkippedProjectInfo[] = [];
	for (const raw of raws) {
		const result = deserializeProject(raw);
		if (result.ok) projects.push(result.project);
		else skipped.push({ reason: result.reason, id: result.id });
	}
	return { projects, skipped };
}
