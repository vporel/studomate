import { JunctionData } from "@/schemas/grafcet/junction.schema";
import { FLOW_GRID_CELL_WIDTH } from "@/ui/constants";

/** Aligne une position (px depuis le bord gauche du nœud) sur la grille du flow. */
export function snapToGrid(positionPx: number): number {
	return (
		Math.round(positionPx / FLOW_GRID_CELL_WIDTH) * FLOW_GRID_CELL_WIDTH || 0
	);
}

function isWithinBounds(positionPx: number, width: number): boolean {
	return (
		positionPx >= FLOW_GRID_CELL_WIDTH &&
		positionPx <= width - FLOW_GRID_CELL_WIDTH
	);
}

/**
 * Retourne la position (alignée grille) que prendrait le pivot pour une position
 * désirée, ou `null` si elle sort des bornes du nœud.
 */
export function resolvePivotPosition(
	desiredPx: number,
	width: number,
): number | null {
	const snapped = snapToGrid(desiredPx);
	return isWithinBounds(snapped, width) ? snapped : null;
}

/**
 * Retourne la position (alignée grille) que prendrait la branche `branchId` pour
 * une position désirée, ou `null` si elle sort des bornes ou chevauche une autre
 * branche.
 */
export function resolveBranchPosition(
	data: JunctionData,
	branchId: string,
	desiredPx: number,
	width: number,
): number | null {
	const snapped = snapToGrid(desiredPx);
	if (!isWithinBounds(snapped, width)) return null;
	const overlaps = data.branchesOrder.some(
		(id) => id !== branchId && data.branches[id]!.position === snapped,
	);
	return overlaps ? null : snapped;
}
