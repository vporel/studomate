"use client";

import { platformShortcut } from "@/lib/platform";
import { Edge, Node } from "@xyflow/react";

export default function paneContextMenuItems(
	getNodes: () => Node[],
	getEdges: () => Edge[],
	actions: { selectAllNodesAndEdges: () => void; selectAllEdges: () => void },
): {
	label: string;
	shortcut?: string;
	onClick: () => void;
	disabled: boolean;
}[][] {
	return [
		[
			{
				label: "Tout sélectionner",
				shortcut: platformShortcut("Ctrl + A", "Cmd + A"),
				onClick: actions.selectAllNodesAndEdges,
				disabled: getNodes().length == 0 && getNodes().length == 0,
			},
			{
				label: "Sélectionner les liaisons",
				onClick: actions.selectAllEdges,
				disabled: getEdges().length == 0,
			},
		],
		[
			{
				label: "Exporter",
				onClick: () => {},
				disabled: getNodes().length == 0 && getNodes().length == 0,
			},
		],
	];
}
