"use client";

import { platformShortcut } from "@/ui/lib/platform";
import LadderWorkflowManager from "@/ui/stores/ladder/managers/workflow.manager";

export default function paneContextMenuItems(
	workflowManager: LadderWorkflowManager,
	sectionId: string,
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
				label: "Tout sélectionner",
				shortcut: platformShortcut("Ctrl + A", "Cmd + A"),
				onClick: () => workflowManager.selectAllNodesAndEdges(sectionId),
				disabled: nodes.length === 0 && edges.length === 0,
			},
			{
				label: "Sélectionner les liaisons",
				onClick: () => workflowManager.selectAllEdges(sectionId),
				disabled: edges.length === 0,
			},
		],
	];
}
