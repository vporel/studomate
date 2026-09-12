import { JunctionData } from "@/schemas/grafcet/junction.schema";
import { FLOW_GRID_CELL_WIDTH } from "@/ui/constants";

/** Marge minimale entre un pin et un bord du nœud. */
const MARGIN = FLOW_GRID_CELL_WIDTH;

export type BranchInsertion = {
	branches: JunctionData["branches"];
	branchesOrder: string[];
	pivotPosition: number;
	nodeX: number;
	width: number;
};

function snapNearest(px: number): number {
	return Math.round(px / FLOW_GRID_CELL_WIDTH) * FLOW_GRID_CELL_WIDTH || 0;
}

function snapDown(px: number): number {
	return Math.floor(px / FLOW_GRID_CELL_WIDTH) * FLOW_GRID_CELL_WIDTH || 0;
}

/**
 * État d'une jonction après insertion d'une branche `newBranchId` à `insertIndex`.
 * Retourne `null` s'il n'y a pas la place.
 *
 * - Insertion au milieu : nouvelle branche à mi-distance des deux voisines
 *   (arrondi grille).
 * - Insertion à une extrémité : on reproduit l'écart de l'intervalle extérieur
 *   existant en élargissant la jonction — et en la décalant vers la gauche pour
 *   une insertion en tête, ce qui laisse les branches existantes immobiles à
 *   l'écran. Bridé au bord droit de la page / à `x = 0` à gauche : dans ce cas la
 *   nouvelle branche est simplement collée au bord (à `MARGIN`).
 */
export default function computeBranchInsertion(
	data: JunctionData,
	width: number,
	nodeX: number,
	pageWidth: number,
	insertIndex: number,
	newBranchId: string,
): BranchInsertion | null {
	const order = data.branchesOrder;
	const n = order.length;
	const posOf = (id: string) => data.branches[id]!.position;
	const unchanged = {
		pivotPosition: data.pivotPosition,
		nodeX,
		width,
	};

	// --- insertion au milieu ---
	if (insertIndex > 0 && insertIndex < n) {
		const leftPos = posOf(order[insertIndex - 1]);
		const rightPos = posOf(order[insertIndex]);
		if (rightPos - leftPos <= FLOW_GRID_CELL_WIDTH) return null;
		const newPos = snapNearest((leftPos + rightPos) / 2);
		if (newPos <= leftPos || newPos >= rightPos) return null;
		return {
			branches: {
				...data.branches,
				[newBranchId]: { id: newBranchId, position: newPos },
			},
			branchesOrder: [
				...order.slice(0, insertIndex),
				newBranchId,
				...order.slice(insertIndex),
			],
			...unchanged,
		};
	}

	// Les extrémités ont besoin d'un intervalle de référence : au moins 2 branches.
	// (Une jonction en a toujours au moins 2 ; repli défensif sinon.)
	if (n < 2) {
		const newPos =
			n === 0
				? snapNearest(width / 2)
				: insertIndex === 0
					? snapNearest(posOf(order[0]) / 2)
					: snapNearest((posOf(order[n - 1]) + width) / 2);
		if (newPos < MARGIN || newPos > width - MARGIN) return null;
		return {
			branches: {
				...data.branches,
				[newBranchId]: { id: newBranchId, position: newPos },
			},
			branchesOrder:
				insertIndex === 0 ? [newBranchId, ...order] : [...order, newBranchId],
			...unchanged,
		};
	}

	// --- insertion à droite ---
	if (insertIndex === n) {
		const last = posOf(order[n - 1]);
		const gap = last - posOf(order[n - 2]);
		const maxPos = snapDown(pageWidth - nodeX - MARGIN);
		const newPos = Math.min(last + gap, maxPos);
		if (newPos <= last) return null;
		return {
			branches: {
				...data.branches,
				[newBranchId]: { id: newBranchId, position: newPos },
			},
			branchesOrder: [...order, newBranchId],
			pivotPosition: data.pivotPosition,
			nodeX,
			width: Math.max(width, newPos + MARGIN),
		};
	}

	// --- insertion à gauche ---
	const gap = posOf(order[1]) - posOf(order[0]);
	const shift = Math.min(gap, nodeX);
	if (shift < FLOW_GRID_CELL_WIDTH) return null;
	const shiftedBranches: JunctionData["branches"] = {};
	for (const id of order)
		shiftedBranches[id] = {
			...data.branches[id]!,
			position: data.branches[id]!.position + shift,
		};
	const newPos = posOf(order[0]);
	shiftedBranches[newBranchId] = { id: newBranchId, position: newPos };
	return {
		branches: shiftedBranches,
		branchesOrder: [newBranchId, ...order],
		pivotPosition: data.pivotPosition + shift,
		nodeX: nodeX - shift,
		width: width + shift,
	};
}
