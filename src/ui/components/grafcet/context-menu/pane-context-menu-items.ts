"use client";

import { platformShortcut } from "@/ui/lib/platform";
import GrafcetCopyCutPasteManager from "@/ui/stores/grafcet/managers/copy-cut-paste.manager";
import GrafcetViewManager from "@/ui/stores/grafcet/managers/view.manager";

export default function paneContextMenuItems(
	viewManager: GrafcetViewManager,
	copyCutPasteManager: GrafcetCopyCutPasteManager,
	screenPosition: { x: number; y: number },
	canPaste: boolean,
): {
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
				label: "Coller",
				shortcut: platformShortcut("Ctrl + V", "Cmd + V"),
				onClick: () => copyCutPasteManager.pasteElements(screenPosition),
				disabled: !canPaste,
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
