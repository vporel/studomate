"use client";

import { platformShortcut } from "@/ui/lib/platform";
import GrafcetViewManager from "@/ui/stores/grafcet/managers/view.manager";

export default function paneContextMenuItems(viewManager: GrafcetViewManager): {
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
