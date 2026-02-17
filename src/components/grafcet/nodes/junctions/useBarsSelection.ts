"use client";

import { useCallback, useEffect, useState } from "react";

/**
 *
 * @returns
 * pivotSelected is true if the pivot of the junction node is selected, false otherwise \
 * selectedBranchIndex = -1 if no branch is selected \
 * selectPivot can be used to select the pivot of the junction node \
 * selectBranch can be used to select a branch by its index \
 * selectPreviousBranch can be used to select the previous branch, if any \
 * selectNextBranch can be used to select the next branch, if any \
 * clearSelection can be used to clear the selection of the pivot and the branches, for example when the user clicks outside of the node
 */
export default function useBarsSelection(branchesCount: number): {
	pivotSelected: boolean;
	selectedBranchIndex: number;
	selectPivot: () => void;
	selectBranch: (branchIndex: number) => void;
	selectPreviousBranch: () => void;
	selectNextBranch: () => void;
	clearSelection: () => void;
} {
	const [pivotSelected, setPivotSelected] = useState<boolean>(false);
	const [selectedBranchIndex, setSelectedBranchIndex] = useState<number>(-1);
	const selectPivot = useCallback(() => {
		setSelectedBranchIndex(-1);
		setPivotSelected(true);
	}, []);
	const selectBranch = useCallback((branchIndex: number) => {
		setPivotSelected(false);
		setSelectedBranchIndex(branchIndex);
	}, []);
	const selectPreviousBranch = useCallback(() => {
		setPivotSelected(false);
		setSelectedBranchIndex((prev) => (prev == -1 ? -1 : prev - 1 < 0 ? 0 : prev - 1));
	}, []);
	const selectNextBranch = useCallback(() => {
		setPivotSelected(false);
		setSelectedBranchIndex((prev) =>
			prev == -1 ? -1 : prev + 1 >= branchesCount ? branchesCount - 1 : prev + 1,
		);
	}, [branchesCount]);
	const clearSelection = useCallback(() => {
		setPivotSelected(false);
		setSelectedBranchIndex(-1);
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
		selectedBranchIndex,
		selectPivot,
		selectBranch,
		selectPreviousBranch,
		selectNextBranch,
		clearSelection,
	};
}
