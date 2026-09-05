import { Dialect } from "@/expression-language/dialect.enum";
import { ProjectMigration } from "./migration";

/**
 * Retire le champ `format` des programmes GRAFCET : la surface de dessin est désormais une
 * taille fixe (page A4 portrait), non configurable, et n'a plus à être persistée.
 */
function stripGrafcetFormat(
	programs: Record<string, unknown>,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const id in programs) {
		const program = programs[id];
		if (
			program &&
			typeof program === "object" &&
			(program as Record<string, unknown>).type === "grafcet"
		) {
			const rest = { ...(program as Record<string, unknown>) };
			delete rest.format;
			result[id] = rest;
		} else {
			result[id] = program;
		}
	}
	return result;
}

/**
 * Deux changements de forme :
 *
 * - Le dialecte des expressions était persisté comme l'ordinal d'un enum numérique (`0` pour FR,
 *   `1` pour EN) — fragile au moindre réordonnancement des membres. Il devient une chaîne
 *   (`"FR"` / `"EN"`). Toute valeur non reconnue (dialecte absent, projet abîmé) est ramenée sur
 *   `"FR"`, seul dialecte possible avant qu'il ne soit configurable.
 * - Le champ `format` des programmes GRAFCET disparaît (voir `stripGrafcetFormat`).
 */
const v1ToV2: ProjectMigration = {
	from: 1,
	description:
		"Store `dialect` as a string (`FR`/`EN`) instead of an enum ordinal, and drop `format` from GRAFCET programs",
	migrate: (project) => ({
		...project,
		dialect: project.dialect === 1 || project.dialect === Dialect.EN
			? Dialect.EN
			: Dialect.FR,
		programs:
			project.programs && typeof project.programs === "object"
				? stripGrafcetFormat(project.programs as Record<string, unknown>)
				: project.programs,
		schemaVersion: 2,
	}),
};

export default v1ToV2;
