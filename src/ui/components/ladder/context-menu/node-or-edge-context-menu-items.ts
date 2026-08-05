"use client";

import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { LADDER_CONNECTION_EDGE_TYPE } from "@/ui/utils/ladder/ladder-flow-builder";
import { Edge, Node, OnDelete } from "@xyflow/react";
import { LadderContextMenuElement } from "./ladder-context-menu";

export default function nodeOrEdgeContextMenuItems(
	element: LadderContextMenuElement,
	handleDelete: OnDelete,
): ContextMenuItemType[][] {
	return [
		[
			{
				label: "Supprimer",
				onClick: () => {
					if (element.type === LADDER_CONNECTION_EDGE_TYPE) {
						handleDelete({ nodes: [], edges: [{ id: (element as Edge).id } as Edge] });
					} else if (element.type !== "pane") {
						handleDelete({ nodes: [{ id: (element as Node).id } as Node], edges: [] });
					}
				},
			},
		],
	];
}
