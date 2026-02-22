"use client";

import { platformShortcut } from "@/lib/platform";
import ViewManager from "@/stores/grafcet/managers/ViewManager";

export default function paneContextMenuItems(viewManager: ViewManager): {
	label: string;
	shortcut?: string;
	onClick: () => void;
	disabled: boolean;
}[][] {
	const nodes = viewManager.getNodes();
	const edges = viewManager.getEdges();
	return [
		[
			{
				label: "Tout sélectionner",
				shortcut: platformShortcut("Ctrl + A", "Cmd + A"),
				onClick: () => viewManager.selectAllNodesAndEdges(),
				disabled: nodes.length == 0 && edges.length == 0,
			},
			{
				label: "Sélectionner les liaisons",
				onClick: () => viewManager.selectAllEdges(),
				disabled: edges.length == 0,
			},
		],
		[
			{
				label: "Exporter",
				onClick: () => {},
				disabled: nodes.length == 0 && edges.length == 0,
			},
		],
	];
}
