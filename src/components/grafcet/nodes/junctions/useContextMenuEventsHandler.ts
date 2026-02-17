"use client";

import { useEffect } from "react";
import { useGrafcetContext } from "../../context/GrafcetContext";
import { GrafcetContextMenuNodeAction } from "../../context/context-menu-events";

export default function useContextMenuEventsHandler(
	nodeId: string,
	selectPivot: () => void,
	selectBranch: (branchId: string) => void,
): void {
	const { contextMenuEvents } = useGrafcetContext();

	//Context menu events
	useEffect(() => {
		const handler = (action: GrafcetContextMenuNodeAction) => {
			if (action.nodeId != nodeId) return;
			if (action.type == "junction-select-pivot") {
				selectPivot();
			} else if (action.type == "junction-select-branch") {
				selectBranch(action.branchId);
			}
		};
		contextMenuEvents.on("node-action", handler);
		return () => {
			contextMenuEvents.off("node-action", handler);
		};
	}, [contextMenuEvents, nodeId, selectPivot, selectBranch]);
}
