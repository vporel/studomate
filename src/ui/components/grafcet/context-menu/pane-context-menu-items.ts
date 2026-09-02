"use client";

import { platformShortcut } from "@/ui/lib/platform";
import GrafcetCopyCutPasteManager from "@/ui/stores/grafcet/managers/copy-cut-paste.manager";
import GrafcetViewManager from "@/ui/stores/grafcet/managers/view.manager";
import { MenuTranslate } from "./menu-translate";

export default function paneContextMenuItems(
	viewManager: GrafcetViewManager,
	copyCutPasteManager: GrafcetCopyCutPasteManager,
	screenPosition: { x: number; y: number },
	canPaste: boolean,
	t: MenuTranslate,
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
				label: t("selectAll"),
				shortcut: platformShortcut("Ctrl + A", "Cmd + A"),
				onClick: () => viewManager.selectAllNodesAndEdges(),
				disabled: nodes.length == 0 && edges.length == 0,
			},
			{
				label: t("selectEdges"),
				onClick: () => viewManager.selectAllEdges(),
				disabled: edges.length == 0,
			},
		],
		[
			{
				label: t("paste"),
				shortcut: platformShortcut("Ctrl + V", "Cmd + V"),
				onClick: () => copyCutPasteManager.pasteElements(screenPosition),
				disabled: !canPaste,
			},
		],
		[
			{
				label: t("export"),
				onClick: () => {},
				disabled: nodes.length == 0 && edges.length == 0,
			},
		],
	];
}
