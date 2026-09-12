import { JUNCTION_BRANCH_MARGIN } from "@/schemas/grafcet/junction-geometry";
import { JunctionData } from "@/schemas/grafcet/junction.schema";
import { FLOW_GRID_CELL_WIDTH } from "@/ui/constants";

const MARGIN = JUNCTION_BRANCH_MARGIN;

export type ExtremeBranchDragBaseline = {
	data: JunctionData;
	nodeX: number;
	width: number;
};

export type ExtremeBranchDragResult = {
	branches: JunctionData["branches"];
	pivotPosition: number;
	nodeX: number;
	width: number;
};

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Géométrie d'une jonction quand on tire l'une de ses branches extrêmes de `dx` px
 * (repère du flow, déjà corrigé du zoom), à partir d'une `baseline` figée au début du glisser.
 *
 * - `edge === "first"` : la branche de tête reste collée à la marge, c'est le bord gauche du
 *   nœud qui bouge (`nodeX` et `width` varient) ; pivot et autres branches gardent leur
 *   position absolue.
 * - `edge === "last"` : seule la largeur varie, bord gauche fixe.
 *
 * Le déplacement est borné par le bord de page, la branche voisine et le pivot ; la fonction
 * renvoie toujours une géométrie valide (le `dx` est ramené dans les bornes), jamais `null`.
 */
export default function resolveExtremeBranchDrag(
	baseline: ExtremeBranchDragBaseline,
	edge: "first" | "last",
	dx: number,
	pageWidth: number,
): ExtremeBranchDragResult {
	const { data, nodeX, width } = baseline;
	const order = data.branchesOrder;
	const posOf = (id: string) => data.branches[id]!.position;
	const snapped =
		Math.round(dx / FLOW_GRID_CELL_WIDTH) * FLOW_GRID_CELL_WIDTH;

	if (edge === "first") {
		const secondPos = posOf(order[1]!);
		const lowerBound = -nodeX;
		const upperBound = Math.min(
			secondPos - 2 * MARGIN,
			data.pivotPosition - MARGIN,
		);
		const delta = clamp(snapped, Math.min(lowerBound, upperBound), upperBound);

		const branches: JunctionData["branches"] = {};
		for (const id of order)
			branches[id] = {
				...data.branches[id]!,
				position: id === order[0] ? MARGIN : posOf(id) - delta,
			};

		return {
			branches,
			pivotPosition: data.pivotPosition - delta,
			nodeX: nodeX + delta,
			width: width - delta,
		};
	}

	const lastId = order[order.length - 1]!;
	const lastPos = posOf(lastId);
	const penultPos = posOf(order[order.length - 2]!);
	// La branche de queue peut venir buter pile sur le pivot (continuité visuelle),
	// mais pas chevaucher l'avant-dernière branche.
	const lowerBound = Math.max(
		penultPos + 2 * MARGIN - lastPos,
		data.pivotPosition - lastPos,
	);
	const upperBound = pageWidth - nodeX - width;
	const delta = clamp(snapped, lowerBound, Math.max(lowerBound, upperBound));

	return {
		branches: {
			...data.branches,
			[lastId]: { ...data.branches[lastId]!, position: lastPos + delta },
		},
		pivotPosition: data.pivotPosition,
		nodeX,
		width: width + delta,
	};
}
