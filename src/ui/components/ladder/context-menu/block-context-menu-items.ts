"use client";

import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { BlockNodeType } from "../nodes/block-node/BlockNode";
import LadderWorkflowManager from "@/ui/stores/ladder/managers/workflow.manager";

/**
 * Items propres à un bloc système (tempo, compteur, compare, assign) — vide pour un appel de
 * programme, qui n'a pas de fenêtre de configuration. Même action que le double-clic sur le bloc
 * dans le canevas (voir `BlockNode`).
 */
export default function blockContextMenuItems(
	element: BlockNodeType,
	workflowManager: LadderWorkflowManager,
): ContextMenuItemType[][] {
	const { id, data } = element;
	if (data.blockType === "user-program") return [];

	return [
		[
			{
				label: "Paramétrer",
				onClick: () => {
					if (data.blockType === "timer") workflowManager.openSystemBlockEditor(id, "timer", data.params);
					else if (data.blockType === "counter") workflowManager.openSystemBlockEditor(id, "counter", data.params);
					else if (data.blockType === "compare") workflowManager.openSystemBlockEditor(id, "compare", data.params);
					else workflowManager.openSystemBlockEditor(id, "assign", data.params);
				},
			},
		],
	];
}
