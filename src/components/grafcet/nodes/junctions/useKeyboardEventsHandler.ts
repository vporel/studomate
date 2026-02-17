"use client";

import { FLOW_GRID_CELL_WIDTH } from "@/constants";
import { JunctionData } from "@/schemas/grafcet/Junction.class";
import { useUpdateNodeInternals } from "@xyflow/react";
import React, { useCallback } from "react";
import { useGrafcetStore } from "../../context/GrafcetContext";

export default function useKeyboardEventsHandler(
	nodeId: string,
	pivotSelected: boolean,
	selectedBranchId: string | null,
	selectPreviousBranch: () => void,
	selectNextBranch: () => void,
	clearSelection: () => void,
): (e: React.KeyboardEvent<HTMLDivElement>) => void {
	const updateNodeData = useGrafcetStore((state) => state.updateNodeData);
	const updatenodeInternals = useUpdateNodeInternals();

	return useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			if (!pivotSelected && selectedBranchId == null) return;
			//If escape is pressed, clear the selection
			if (e.key == "Escape") {
				e.preventDefault();
				e.stopPropagation();
				clearSelection();
				return;
			}
			const toLeft = e.key == "ArrowLeft";
			const toRight = e.key == "ArrowRight";
			if (toLeft || toRight) {
				e.preventDefault();
				e.stopPropagation();
				if (e.shiftKey) {
					if (toLeft) selectPreviousBranch();
					else selectNextBranch();
					return;
				}
				updateNodeData(nodeId, (prevData) => {
					prevData = prevData as JunctionData;
					const dataToChange: Partial<JunctionData> = {};
					if (pivotSelected) {
						const newPosition = prevData.pivotPosition + FLOW_GRID_CELL_WIDTH * (toLeft ? -1 : 1);
						if (
							newPosition >= FLOW_GRID_CELL_WIDTH &&
							newPosition <= prevData.width - FLOW_GRID_CELL_WIDTH
						) {
							dataToChange.pivotPosition = newPosition;
						}
					}
					if (selectedBranchId != null) {
						const newPosition =
							prevData.branches[selectedBranchId]!.position +
							FLOW_GRID_CELL_WIDTH * (toLeft ? -1 : 1);
						if (
							newPosition >= FLOW_GRID_CELL_WIDTH &&
							newPosition <= prevData.width - FLOW_GRID_CELL_WIDTH &&
							!prevData.branchesOrder.some((branchId) =>
								branchId === selectedBranchId
									? false
									: prevData.branches[branchId]!.position === newPosition,
							)
						) {
							dataToChange.branches = { ...prevData.branches };
							dataToChange.branches[selectedBranchId]!.position = newPosition;
						}
					}
					return dataToChange;
				});
				updatenodeInternals(nodeId);
			}
		},
		[
			clearSelection,
			nodeId,
			pivotSelected,
			selectNextBranch,
			selectPreviousBranch,
			selectedBranchId,
			updateNodeData,
			updatenodeInternals,
		],
	);
}
