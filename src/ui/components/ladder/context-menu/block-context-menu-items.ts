"use client";

import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { BlockNodeType } from "../nodes/block-node/BlockNode";
import LadderWorkflowManager from "@/ui/stores/ladder/managers/workflow.manager";

/**
 * Items propres à un bloc système à fenêtre de configuration (tempo, compteur) — vide pour tous
 * les autres blocs (appel de programme : pas de configuration ; compare/assign/arithmetic :
 * configurés entièrement sur le canevas). Même action que le double-clic sur le bloc dans le
 * canevas (voir `BlockNode`).
 */
export default function blockContextMenuItems(
	element: BlockNodeType,
	workflowManager: LadderWorkflowManager,
): ContextMenuItemType[][] {
	const { id, data } = element;
	if (data.blockType !== "timer" && data.blockType !== "counter") return [];

	return [
		[
			{
				label: "Paramétrer",
				onClick: () => {
					if (data.blockType === "timer")
						workflowManager.openSystemBlockEditor(id, "timer", data.params);
					else workflowManager.openSystemBlockEditor(id, "counter", data.params);
				},
			},
		],
	];
}
