import Project from "@/schemas/project/project.schema";
import { isFromNewerVersion, migrateProject } from "./migrations";

/**
 * Reconstruit un projet à partir de sa forme brute (telle que lue d'un repository), en le
 * migrant si besoin et en refusant ce qui n'est pas lisible plutôt que de produire un objet
 * incohérent.
 *
 * Partagé entre tous les repositories : la migration ne dépend que de la forme du projet,
 * jamais du support qui l'a stocké.
 */
export function deserializeProject(raw: Record<string, any>): Project | null {
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
