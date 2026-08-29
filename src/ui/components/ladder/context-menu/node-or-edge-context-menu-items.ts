"use client";

import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { platformShortcut } from "@/ui/lib/platform";
import LadderCopyCutPasteManager from "@/ui/stores/ladder/managers/copy-cut-paste.manager";
import { LADDER_CONNECTION_EDGE_TYPE } from "@/ui/utils/ladder/ladder-flow-builder";
import { Edge, Node, OnDelete } from "@xyflow/react";
import { LadderContextMenuElement } from "./ladder-context-menu";

export default function nodeOrEdgeContextMenuItems(
	element: LadderContextMenuElement,
	handleDelete: OnDelete,
	copyCutPasteManager: LadderCopyCutPasteManager,
): ContextMenuItemType[][] {
	return [
		[
			{
				label: "Copier",
				shortcut: platformShortcut("Ctrl+C", "Cmd+C"),
				onClick: () => copyCutPasteManager.copySelectedElements(),
			},
			{
				label: "Couper",
				shortcut: platformShortcut("Ctrl+X", "Cmd+X"),
				onClick: () => copyCutPasteManager.cutSelectedElements(),
			},
		],
		[
			{
				label: "Supprimer",
				onClick: () => {
					if (element.type === LADDER_CONNECTION_EDGE_TYPE) {
						handleDelete({
							nodes: [],
							edges: [{ id: (element as Edge).id } as Edge],
						});
					} else if (element.type !== "pane") {
						handleDelete({
							nodes: [{ id: (element as Node).id } as Node],
							edges: [],
						});
					}
				},
			},
		],
	];
}
