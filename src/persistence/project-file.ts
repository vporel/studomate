import { createRandomId } from "@/ids";
import { isRecord } from "@/lib/object";
import Project from "@/schemas/project/project.schema";
import { isFromNewerVersion, migrateProject } from "./migrations/schema";

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
 * Why a file could not be read as a project:
 * - `not-json`: the content is not valid JSON
 * - `not-a-project`: valid JSON, but not shaped like a project
 * - `newer-version`: saved by a more recent version of the app than this one
 */
export type ProjectFileErrorReason =
	"not-json" | "not-a-project" | "newer-version";

export class ProjectFileError extends Error {
	constructor(
		readonly reason: ProjectFileErrorReason,
		options?: { cause?: unknown },
	) {
		super(`Project file rejected: ${reason}`, options);
		this.name = "ProjectFileError";
	}
}

/**
 * Lit un fichier de projet, en le migrant si besoin.
 *
 * @throws {ProjectFileError} si le contenu n'est pas un projet lisible, ou s'il vient d'une
 * version plus récente que celle que cette application sait interpréter
 */
export function parseProjectFromFile(text: string): Project {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch (cause) {
		throw new ProjectFileError("not-json", { cause });
	}
	if (!isRecord(parsed)) throw new ProjectFileError("not-a-project");
	if (isFromNewerVersion(parsed)) throw new ProjectFileError("newer-version");
	let migrated: unknown;
	try {
		migrated = migrateProject(parsed).project;
	} catch (cause) {
		throw new ProjectFileError("not-a-project", { cause });
	}
	if (!Project.hasValidShape(migrated))
		throw new ProjectFileError("not-a-project");
	try {
		return Project.createFromJSON(JSON.stringify(migrated));
	} catch (cause) {
		throw new ProjectFileError("not-a-project", { cause });
	}
}

/**
 * Reads a project file and gives the project a fresh id, so that importing never overwrites an
 * existing project nor collides with another account's cloud project.
 *
 * @throws like {@link parseProjectFromFile}
 */
export function importProjectFromFile(text: string): Project {
	const project = parseProjectFromFile(text);
	project.id = createRandomId();
	return project;
}
