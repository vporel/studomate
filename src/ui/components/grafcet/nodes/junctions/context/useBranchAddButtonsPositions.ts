"use client";

import { JunctionData } from "@/schemas/grafcet/junction.schema";
import { FLOW_GRID_CELL_WIDTH } from "@/ui/constants";
import { useEffect, useState } from "react";
import { JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH } from "../JunctionNodeBranchAddButtons";

export type BranchAddButton = { left: number; insertIndex: number };

/** En deçà de cet écart entre deux branches, insérer entre elles serait trop à l'étroit. */
const MIN_GAP_FOR_INNER_BUTTON = 2 * FLOW_GRID_CELL_WIDTH;

export default function useBranchAddButtonsPositions(
	nodeData: JunctionData,
	width: number,
) {
	const [buttons, setButtons] = useState<BranchAddButton[]>([]);
	useEffect(() => {
		const order = nodeData.branchesOrder;
		if (order.length === 0) {
			setButtons([{ left: width / 2, insertIndex: 0 }]);
			return;
		}
		const posOf = (id: string) => nodeData.branches[id]!.position;
		const result: BranchAddButton[] = [];

		// Bouton en tête
		result.push({
			left:
				posOf(order[0]) <= JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH
					? -JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH / 2
					: posOf(order[0]) / 2,
			insertIndex: 0,
		});

		// Boutons intermédiaires — masqués si l'écart ne laisse aucun créneau libre
		for (let i = 1; i < order.length; i++) {
			if (posOf(order[i]) - posOf(order[i - 1]) <= MIN_GAP_FOR_INNER_BUTTON)
				continue;
			result.push({
				left: (posOf(order[i - 1]) + posOf(order[i])) / 2,
				insertIndex: i,
			});
		}

		// Bouton en fin
		result.push({
			left:
				width - posOf(order[order.length - 1]) <=
				JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH
					? width + JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH / 2
					: (posOf(order[order.length - 1]) + width) / 2,
			insertIndex: order.length,
		});

		setButtons(result);
	}, [width, nodeData.branchesOrder, nodeData.branches]);

	return buttons;
}
