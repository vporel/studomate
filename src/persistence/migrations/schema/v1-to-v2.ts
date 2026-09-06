import { Dialect } from "@/expression-language/dialect.enum";
import {
	JUNCTION_BRANCH_MARGIN,
	normalizeJunctionGeometry,
} from "@/schemas/grafcet/junction-geometry";
import { JunctionData } from "@/schemas/grafcet/junction.schema";
import { ProjectMigration } from "./migration";

const JUNCTION_COLLECTIONS = [
	"junctionsAndStarts",
	"junctionsAndEnds",
	"junctionsOrStarts",
	"junctionsOrEnds",
];

function snap(px: number): number {
	return (
		Math.round(px / JUNCTION_BRANCH_MARGIN) * JUNCTION_BRANCH_MARGIN || 0
	);
}

/** Vrai si l'objet a la forme d'un élément de jonction persisté (data + position + size). */
function looksLikeJunction(el: unknown): el is {
	data: JunctionData;
	position: { x: number; y: number };
	size: { width: number; height: number };
} {
	if (!el || typeof el !== "object") return false;
	const e = el as Record<string, unknown>;
	const data = e.data as Record<string, unknown> | undefined;
	return (
		!!data &&
		Array.isArray(data.branchesOrder) &&
		typeof data.branches === "object" &&
		typeof data.pivotPosition === "number" &&
		!!e.position &&
		!!e.size
	);
}

/**
 * Amène chaque jonction à sa forme canonique : première branche à la marge, largeur calée
 * sur la dernière branche, positions alignées sur la grille. Auparavant la largeur d'une
 * jonction était réglée à la main (poignée de redimensionnement) indépendamment des branches.
 */
function normalizeGrafcetJunctions(
	grafcet: Record<string, unknown>,
): Record<string, unknown> {
	const result = { ...grafcet };
	for (const collection of JUNCTION_COLLECTIONS) {
		const junctions = grafcet[collection];
		if (!junctions || typeof junctions !== "object") continue;
		const normalized: Record<string, unknown> = {};
		for (const id in junctions as Record<string, unknown>) {
			const el = (junctions as Record<string, unknown>)[id];
			if (!looksLikeJunction(el)) {
				normalized[id] = el;
				continue;
			}
			const geometry = normalizeJunctionGeometry(
				el.data,
				snap(el.position.x),
				el.size.width,
			);
			normalized[id] = {
				...el,
				data: geometry.data,
				position: { ...el.position, x: geometry.nodeX },
				size: { ...el.size, width: geometry.width },
			};
		}
		result[collection] = normalized;
	}
	return result;
}

/**
 * Retire le champ `format` des programmes GRAFCET (surface de dessin désormais fixe, page A4
 * portrait) et normalise la géométrie des jonctions.
 */
function migrateGrafcetPrograms(
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
			result[id] = normalizeGrafcetJunctions(rest);
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
 * - Le champ `format` des programmes GRAFCET disparaît, et la géométrie des jonctions est
 *   normalisée (voir `migrateGrafcetPrograms`).
 */
const v1ToV2: ProjectMigration = {
	from: 1,
	description:
		"Store `dialect` as a string (`FR`/`EN`) instead of an enum ordinal, drop `format` from GRAFCET programs, and normalize junction geometry",
	migrate: (project) => ({
		...project,
		dialect: project.dialect === 1 || project.dialect === Dialect.EN
			? Dialect.EN
			: Dialect.FR,
		programs:
			project.programs && typeof project.programs === "object"
				? migrateGrafcetPrograms(project.programs as Record<string, unknown>)
				: project.programs,
		schemaVersion: 2,
	}),
};

export default v1ToV2;
