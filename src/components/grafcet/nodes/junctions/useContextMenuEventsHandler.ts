"use client";

import { useEffect } from "react";
import { useGrafcetContext } from "../../context/GrafcetContext";
import { GrafcetContextMenuNodeAction } from "../../context/context-menu-events";

/**
 *
 * @returns
 * pivotSelected is true if the pivot of the junction node is selected, false otherwise
 * selectedBranchIndex = -1 if no branch is selected
 * clearSelection can be used to clear the selection of the pivot and the branches, for example when the user clicks outside of the node
 */
export default function useContextMenuEventsHandler(
	nodeId: string,
	selectPivot: () => void,
	selectBranch: (branchIndex: number) => void,
): void {
	const { contextMenuEvents } = useGrafcetContext();

	//Context menu events
	useEffect(() => {
		const handler = (action: GrafcetContextMenuNodeAction) => {
			if (action.nodeId != nodeId) return;
			if (action.type == "junction-select-pivot") {
				selectPivot();
			} else if (action.type == "junction-select-branch") {
				selectBranch(action.branchIndex);
			}
		};
		contextMenuEvents.on("node-action", handler);
		return () => {
			contextMenuEvents.off("node-action", handler);
		};
	}, [contextMenuEvents, nodeId, selectPivot, selectBranch]);
}
