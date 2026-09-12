"use client";

import { Node } from "@xyflow/react";
import { useCallback } from "react";
import { useLadderStore } from "../context/LadderContext";

const CELL_DELTAS: Record<string, [number, number]> = {
	ArrowUp: [-1, 0],
	ArrowDown: [1, 0],
	ArrowLeft: [0, -1],
	ArrowRight: [0, 1],
};

/**
 * Déplacement au clavier (flèches) des éléments sélectionnés d'une section, d'une cellule de
 * grille par appui — pendant du glisser à la souris, même chemin de commandes via
 * `LadderWorkflowManager.moveSelectedElementsByCells`. Ne fait rien si aucun élément n'est
 * sélectionné, ou si un autre gestionnaire a déjà traité la touche (`defaultPrevented`, cas du
 * déplacement d'un segment de connexion sélectionnée sur ←/→).
 */
export default function useLadderNodeMoveKeyboardHandler(
	sectionId: string,
	nodes: Node[],
) {
	const workflowManager = useLadderStore((state) => state.workflowManager);

	return useCallback(
		(e: React.KeyboardEvent) => {
			if (e.defaultPrevented) return;
			const delta = CELL_DELTAS[e.key];
			if (!delta) return;
			const hasSelection = nodes.some(
				(node) => node.selected && node.type !== "railTerminal",
			);
			if (!hasSelection) return;

			e.preventDefault();
			e.stopPropagation();
			workflowManager.moveSelectedElementsByCells(sectionId, delta[0], delta[1]);
		},
		[nodes, sectionId, workflowManager],
	);
}
