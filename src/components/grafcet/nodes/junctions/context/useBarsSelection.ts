"use client";

import { useCallback, useEffect, useState } from "react";

/**
 *
 * @returns
 * pivotSelected is true if the pivot of the junction node is selected, false otherwise \
 * selectedBranchId = -1 if no branch is selected \
 * selectPivot can be used to select the pivot of the junction node \
 * selectBranch can be used to select a branch by its index \
 * selectPreviousBranch can be used to select the previous branch, if any \
 * selectNextBranch can be used to select the next branch, if any \
 * clearSelection can be used to clear the selection of the pivot and the branches, for example when the user clicks outside of the node
 */
export default function useBarsSelection(branchesOrder: string[]): {
	pivotSelected: boolean;
	selectedBranchId: string | null;
	selectPivot: () => void;
	selectBranch: (branchId: string) => void;
	selectPreviousBranch: () => void;
	selectNextBranch: () => void;
	clearSelection: () => void;
} {
	const [pivotSelected, setPivotSelected] = useState<boolean>(false);
	const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
	const selectPivot = useCallback(() => {
		setSelectedBranchId(null);
		setPivotSelected(true);
	}, []);
	const selectBranch = useCallback((branchId: string) => {
		setPivotSelected(false);
		setSelectedBranchId(branchId);
	}, []);
	const selectPreviousBranch = useCallback(() => {
		setPivotSelected(false);
		const currentIndex = selectedBranchId ? branchesOrder.findIndex((id) => id === selectedBranchId) : -1;
		if (currentIndex > 0) {
			setSelectedBranchId(branchesOrder[currentIndex - 1]);
		}
	}, [branchesOrder, selectedBranchId]);
	const selectNextBranch = useCallback(() => {
		setPivotSelected(false);
		const currentIndex = selectedBranchId ? branchesOrder.findIndex((id) => id === selectedBranchId) : -1;
		if (currentIndex >= 0 && currentIndex < branchesOrder.length - 1) {
			setSelectedBranchId(branchesOrder[currentIndex + 1]);
		}
	}, [branchesOrder, selectedBranchId]);
	const clearSelection = useCallback(() => {
		setPivotSelected(false);
		setSelectedBranchId(null);
	}, []);

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

	return {
		pivotSelected,
		selectedBranchId,
		selectPivot,
		selectBranch,
		selectPreviousBranch,
		selectNextBranch,
		clearSelection,
	};
}
