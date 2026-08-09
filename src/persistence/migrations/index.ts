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
 * @param raw Projet tel que lu, de forme non garantie
 * @returns Le projet à la version courante, et la version d'où il vient
 */
export function migrateProject(raw: Record<string, any>): {
	project: Record<string, any>;
	from: number;
} {
	const from = readVersion(raw);
	let current = raw;
	for (const migration of MIGRATIONS) {
		if (migration.from < from) continue;
		current = migration.migrate(current);
	}
	return { project: current, from };
}

/**
 * @returns true si le projet vient d'une version postérieure à celle que cette application
 * sait lire. On préfère alors le laisser intact et refuser de l'ouvrir plutôt que de
 * l'interpréter partiellement — et de le réécrire abîmé.
 */
export function isFromNewerVersion(raw: Record<string, any>): boolean {
	return readVersion(raw) > PROJECT_SCHEMA_VERSION;
}

function readVersion(raw: Record<string, any>): number {
	return typeof raw?.schemaVersion === "number" ? raw.schemaVersion : UNVERSIONED;
}
