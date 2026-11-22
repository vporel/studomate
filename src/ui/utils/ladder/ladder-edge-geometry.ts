import { CELL_SUBDIVISIONS } from "@/ui/utils/ladder/ladder-connection-path";
import {
	getConnectionLinePoints,
	GRID_CELL_WIDTH,
	POWER_RAIL_OFFSET,
} from "@/ui/utils/ladder/ladder-flow-builder";

/** Largeur d'une subdivision de colonne (voir `CELL_SUBDIVISIONS`, `ladder-connection-path.ts`)
 * — le pas de déplacement d'un coude, souris comme clavier. */
export const QUARTER_CELL_WIDTH = GRID_CELL_WIDTH / CELL_SUBDIVISIONS;

export type Vertex = [number, number];

/** `data.points` est en quarts de cellule de grille (voir `ladder-connection-path.ts`) —
 * conversion en pixels pour le rendu, symétrique de `POWER_RAIL_OFFSET + col*GRID_CELL_WIDTH`
 * côté nœuds. */
export const quarterColToPx = (quarterCol: number) =>
	POWER_RAIL_OFFSET + quarterCol * QUARTER_CELL_WIDTH;

/** Inverse de `quarterColToPx` : claque une abscisse en pixels sur le quart de colonne le plus proche. */
export const pxToQuarterCol = (x: number) =>
	Math.round((x - POWER_RAIL_OFFSET) / QUARTER_CELL_WIDTH);

/**
 * `[source, ...points, target]`, en pixels — pas de recours à `getSmoothStepPath` : `points`
 * peut désormais porter jusqu'à 3 segments (stub après la source, vertical, stub avant la
 * cible), une forme que la lib ne sait pas produire nativement. `points` ne contient jamais la
 * ligne de la source/cible elles-mêmes (toujours celle, actuelle, de `sourceY`/`targetY`) — voir
 * le même principe côté domaine dans `computeConnectionSegments`.
 */
export function buildVertices(
	sourceX: number,
	sourceY: number,
	targetX: number,
	targetY: number,
	points: [number, number][],
): Vertex[] {
	if (sourceY === targetY)
		return [
			[sourceX, sourceY],
			[targetX, targetY],
		];
	if (points.length === 0)
		return getConnectionLinePoints(sourceX, sourceY, targetX, targetY);
	const bend: Vertex[] = points.map(([, quarterCol], i) => [
		quarterColToPx(quarterCol),
		i === 0 ? sourceY : targetY,
	]);
	return [[sourceX, sourceY], ...bend, [targetX, targetY]];
}

/** Le segment vertical du tracé, s'il y en a un — le seul déplaçable (voir la conception : un
 * nœud pousse ses propres connexions, l'utilisateur ne peut que déplacer ce segment lui-même). */
export function findVerticalSegment(
	vertices: Vertex[],
): { x: number; yA: number; yB: number } | null {
	for (let i = 0; i < vertices.length - 1; i++) {
		const [xA, yA] = vertices[i];
		const [xB, yB] = vertices[i + 1];
		if (xA === xB && yA !== yB) return { x: xA, yA, yB };
	}
	return null;
}
