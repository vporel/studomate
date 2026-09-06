import { JunctionData } from "./junction.schema";

/**
 * Marge entre un pin de jonction et un bord du nœud. Vaut une cellule de la grille du flow :
 * la première branche est toujours à `JUNCTION_BRANCH_MARGIN` du bord gauche, la dernière à
 * `JUNCTION_BRANCH_MARGIN` du bord droit, et la largeur du nœud en découle
 * (`largeur = position de la dernière branche + JUNCTION_BRANCH_MARGIN`).
 */
export const JUNCTION_BRANCH_MARGIN = 10;

export type JunctionGeometry = {
	data: JunctionData;
	nodeX: number;
	width: number;
};

function snap(px: number): number {
	return (
		Math.round(px / JUNCTION_BRANCH_MARGIN) * JUNCTION_BRANCH_MARGIN || 0
	);
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Ramène une jonction à sa forme canonique : première branche collée à la marge gauche,
 * largeur calée sur la dernière branche, pivot maintenu dans le nœud. Le bord gauche est
 * translaté (position + largeur) sans jamais passer `x = 0`. Les branches intermédiaires et
 * le pivot gardent leur position absolue.
 *
 * Sans effet sur une jonction déjà canonique. Une jonction de moins de deux branches est
 * laissée telle quelle (cas défensif : l'analyseur exige au moins deux branches).
 */
export function normalizeJunctionGeometry(
	data: JunctionData,
	nodeX: number,
	width: number,
): JunctionGeometry {
	const order = data.branchesOrder;
	if (order.length < 2) return { data, nodeX, width };

	const positions = order.map((id) => data.branches[id]!.position);
	const first = positions[0]!;
	const last = positions[positions.length - 1]!;

	const shift = Math.max(first - JUNCTION_BRANCH_MARGIN, -nodeX);

	const branches: JunctionData["branches"] = {};
	for (const id of order)
		branches[id] = {
			...data.branches[id]!,
			position: snap(data.branches[id]!.position - shift),
		};

	const newWidth = snap(last - shift) + JUNCTION_BRANCH_MARGIN;
	const pivotPosition = clamp(
		snap(data.pivotPosition - shift),
		JUNCTION_BRANCH_MARGIN,
		newWidth - JUNCTION_BRANCH_MARGIN,
	);

	return {
		data: { ...data, branches, pivotPosition },
		nodeX: nodeX + shift,
		width: newWidth,
	};
}
