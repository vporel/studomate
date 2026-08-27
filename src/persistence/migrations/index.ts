import { PROJECT_SCHEMA_VERSION } from "@/schemas/project/project.schema";
import { ProjectMigration, UNVERSIONED } from "./migration";
import v0ToV1 from "./v0-to-v1";

/**
 * Les migrations, dans l'ordre. Ajouter un saut de version consiste à ajouter un fichier et
 * une ligne ici, puis à incrémenter `PROJECT_SCHEMA_VERSION` dans le schéma du projet.
 */
const MIGRATIONS: ProjectMigration[] = [v0ToV1];

/**
 * Amène un projet brut à la version courante de sa forme.
 *
 * La version est portée par le projet lui-même, donc cette fonction sert **tous** les
 * supports : stockage local, fichier exporté, et demain une base de données. Aucun d'eux n'a
 * à connaître les migrations.
 *
 * Chaque étape est déclenchée sur la version réellement courante (relue après l'étape
 * précédente), et doit faire progresser `schemaVersion` — sinon la chaîne est rompue et on
 * lève plutôt que de produire un projet à moitié migré.
 *
 * @param raw Projet tel que lu, de forme non garantie
 * @param migrations Chaîne de migrations à appliquer — paramétrable pour les tests uniquement
 * @returns Le projet à la version courante, et la version d'où il vient
 */
export function migrateProject(
	raw: unknown,
	migrations: ProjectMigration[] = MIGRATIONS,
): {
	project: unknown;
	from: number;
} {
	const from = readVersion(raw);
	let current = raw as Record<string, unknown>;
	let currentVersion = from;
	for (const migration of migrations) {
		if (migration.from !== currentVersion) continue;
		current = migration.migrate(current);
		const nextVersion = readVersion(current);
		if (nextVersion <= currentVersion) {
			throw new Error(
				`Migration depuis la version ${migration.from} : schemaVersion n'a pas progressé (${currentVersion} → ${nextVersion}).`,
			);
		}
		currentVersion = nextVersion;
	}
	return { project: current, from };
}

/**
 * @returns true si le projet vient d'une version postérieure à celle que cette application
 * sait lire. On préfère alors le laisser intact et refuser de l'ouvrir plutôt que de
 * l'interpréter partiellement — et de le réécrire abîmé.
 */
export function isFromNewerVersion(raw: unknown): boolean {
	return readVersion(raw) > PROJECT_SCHEMA_VERSION;
}

function readVersion(raw: unknown): number {
	const version = (raw as { schemaVersion?: unknown })?.schemaVersion;
	return typeof version === "number" ? version : UNVERSIONED;
}
