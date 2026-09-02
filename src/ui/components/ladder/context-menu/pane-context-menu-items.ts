"use client";

import { platformShortcut } from "@/ui/lib/platform";
import LadderCopyCutPasteManager from "@/ui/stores/ladder/managers/copy-cut-paste.manager";
import LadderWorkflowManager from "@/ui/stores/ladder/managers/workflow.manager";
import { MenuTranslate } from "./menu-translate";

export default function paneContextMenuItems(
	workflowManager: LadderWorkflowManager,
	sectionId: string,
	copyCutPasteManager: LadderCopyCutPasteManager,
	screenPosition: { x: number; y: number },
	canPaste: boolean,
	t: MenuTranslate,
): {
	label: string;
	shortcut?: string;
	onClick: () => void;
	disabled: boolean;
}[][] {
	const nodes = workflowManager.getNodes(sectionId);
	const edges = workflowManager.getEdges(sectionId);
	return [
		[
			{
				label: t("selectAll"),
				shortcut: platformShortcut("Ctrl + A", "Cmd + A"),
				onClick: () => workflowManager.selectAllNodesAndEdges(sectionId),
				disabled: nodes.length === 0 && edges.length === 0,
			},
			{
				label: t("selectEdges"),
				onClick: () => workflowManager.selectAllEdges(sectionId),
				disabled: edges.length === 0,
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
	];
}
