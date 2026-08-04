import Project from "@/schemas/project/project.schema";
import { isFromNewerVersion, migrateProject } from "./migrations";

/**
 * Sérialisation d'un projet vers un fichier autonome.
 *
 * Aucune enveloppe : la version de forme est un champ du projet, elle voyage donc avec lui.
 * Extraire ou recopier le contenu ne peut pas la perdre.
 */
export function serializeProjectToFile(project: Project): string {
	return JSON.stringify(project, null, 2);
}

/**
 * Lit un fichier de projet, en le migrant si besoin.
 *
 * @throws si le contenu n'est pas un projet lisible, ou s'il vient d'une version plus récente
 * que celle que cette application sait interpréter
 */
export function parseProjectFromFile(text: string): Project {
	const parsed = JSON.parse(text);
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error("Le fichier ne contient pas un projet.");
	}
	if (isFromNewerVersion(parsed)) {
		throw new Error(
			"Ce projet a été enregistré par une version plus récente de Studomate. Mettez l'application à jour pour l'ouvrir.",
		);
	}
	const { project } = migrateProject(parsed);
	return Project.createFromJSON(JSON.stringify(project));
}
