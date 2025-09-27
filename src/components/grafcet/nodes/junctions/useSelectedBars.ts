"use client";

import { useCallback, useEffect, useState } from "react";
import { GrafcetContextMenuNodeAction, useGrafcetContext } from "../../context/GrafcetContext";

/**
 *
 * @returns selectedBranchIndex = -1 if no branch is selected
 */
export default function useSelectedBars(
	nodeId: string
): [pivotSelected: boolean, selectedBranchIndex: number, clearSelection: () => void] {
	const { contextMenuEvents } = useGrafcetContext();
	const [pivotSelected, setPivotSelected] = useState<boolean>(false);
	const [selectedBranchIndex, setSelectedBranchIndex] = useState<number>(-1);
	const clearSelection = useCallback(() => {
		setPivotSelected(false);
		setSelectedBranchIndex(-1);
	}, []);

	//Context menu events
	useEffect(() => {
		const handler = (action: GrafcetContextMenuNodeAction) => {
			if (action.nodeId != nodeId) return;
			if (action.type == "junction-select-pivot") {
				setSelectedBranchIndex(-1);
				setPivotSelected(true);
			} else if (action.type == "junction-select-branch") {
				setPivotSelected(false);
				setSelectedBranchIndex(action.branchIndex);
			}
		};
		contextMenuEvents.on("node-action", handler);
		return () => {
			contextMenuEvents.off("node-action", handler);
		};
	}, [nodeId]);

	//Clear the selection when another part of the window is clicked
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (e.buttons == 1) clearSelection();
		};
		window.addEventListener("mousedown", handler);
		return () => {
			window.removeEventListener("mousedown", handler);
		};
	}, [clearSelection]);

	return [pivotSelected, selectedBranchIndex, clearSelection];
}
