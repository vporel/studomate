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
export default function useBarsSelection(
	nodeId: string,
	branchesOrder: string[],
): {
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
		const currentIndex = selectedBranchId
			? branchesOrder.findIndex((id) => id === selectedBranchId)
			: -1;
		if (currentIndex > 0) {
			setSelectedBranchId(branchesOrder[currentIndex - 1]);
		}
	}, [branchesOrder, selectedBranchId]);
	const selectNextBranch = useCallback(() => {
		setPivotSelected(false);
		const currentIndex = selectedBranchId
			? branchesOrder.findIndex((id) => id === selectedBranchId)
			: -1;
		if (currentIndex >= 0 && currentIndex < branchesOrder.length - 1) {
			setSelectedBranchId(branchesOrder[currentIndex + 1]);
		}
	}, [branchesOrder, selectedBranchId]);
	const clearSelection = useCallback(() => {
		setPivotSelected(false);
		setSelectedBranchId(null);
	}, []);

	// Tout clic gauche ailleurs (nœud, liaison, fond, corps de la jonction) annule la
	// sélection du pin. En phase de capture pour passer avant React Flow, qui stoppe la
	// propagation du mousedown sur ses nœuds. Seul un clic sur un pin de CETTE jonction
	// est épargné (c'est lui qui va le sélectionner — voir JunctionNodeVerticalBar).
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (e.button !== 0) return;
			const bar = (e.target as HTMLElement)?.closest?.(".junction-node__bar");
			if (bar && bar.closest(`[id="grafcet-node-${nodeId}"]`) != null) return;
			clearSelection();
		};
		document.addEventListener("mousedown", handler, true);
		return () => {
			document.removeEventListener("mousedown", handler, true);
		};
	}, [clearSelection, nodeId]);

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
