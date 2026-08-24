"use client";

import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { BlockNodeType } from "../nodes/block-node/BlockNode";
import LadderWorkflowManager from "@/ui/stores/ladder/managers/workflow.manager";

/**
 * Items propres à un bloc système (tempo aujourd'hui) — vide pour un appel de programme, qui n'a
 * pas de fenêtre de configuration. Même action que le double-clic sur le bloc dans le canevas
 * (voir `BlockNode`).
 */
export default function blockContextMenuItems(
	element: BlockNodeType,
	workflowManager: LadderWorkflowManager,
): ContextMenuItemType[][] {
	if (element.data.blockType !== "timer") return [];
	const { id, data } = element;

	return [
		[
			{
				label: "Paramétrer",
				onClick: () => workflowManager.openSystemBlockEditor(id, data.params),
			},
		],
	];
}
