"use client";

import { JunctionData } from "@/schemas/grafcet/junction.schema";
import { FLOW_GRID_CELL_WIDTH } from "@/ui/constants";
import { GRAFCET_PAGE_DIMENSIONS } from "@/ui/utils/grafcet/grafcet-utils";
import resolveExtremeBranchDrag from "@/ui/utils/grafcet/junction-extreme-branch-drag";
import { useUpdateNodeInternals } from "@xyflow/react";
import React, { useCallback } from "react";
import { useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext";
import {
	resolveBranchPosition,
	resolvePivotPosition,
} from "./branch-position";

export default function useKeyboardEventsHandler(
	nodeId: string,
	pivotSelected: boolean,
	selectedBranchId: string | null,
	selectPreviousBranch: () => void,
	selectNextBranch: () => void,
	clearSelection: () => void,
	width: number,
	nodeX: number,
	data: JunctionData,
): (e: React.KeyboardEvent<HTMLDivElement>) => void {
	const workflowManager = useGrafcetStore((state) => state.workflowManager);
	const updatenodeInternals = useUpdateNodeInternals();

	return useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			if (!pivotSelected && selectedBranchId == null) return;
			//If escape is pressed, clear the selection
			switch (e.key) {
				case "Escape":
					e.preventDefault();
					e.stopPropagation();
					clearSelection();
					return;
			}
			if (e.key === "Backspace" || e.key === "Delete") {
				// Empêche React Flow de supprimer la jonction entière : quand un pin est
				// sélectionné, c'est la branche qui part.
				e.preventDefault();
				e.stopPropagation();
				if (pivotSelected || selectedBranchId == null) return;
				workflowManager.deleteJunctionBranch(nodeId, selectedBranchId);
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
				const step = FLOW_GRID_CELL_WIDTH * (toLeft ? -1 : 1);

				const order = data.branchesOrder;
				const edge =
					selectedBranchId != null && order.length >= 2
						? selectedBranchId === order[0]
							? "first"
							: selectedBranchId === order[order.length - 1]
								? "last"
								: null
						: null;
				if (edge != null) {
					const resolved = resolveExtremeBranchDrag(
						{ data, nodeX, width },
						edge,
						step,
						GRAFCET_PAGE_DIMENSIONS.width,
					);
					if (resolved.nodeX !== nodeX || resolved.width !== width) {
						workflowManager.applyJunctionBranchDrag(nodeId, {
							branches: resolved.branches,
							pivotPosition: resolved.pivotPosition,
							nodeX: resolved.nodeX,
							width: resolved.width,
						});
						updatenodeInternals(nodeId);
					}
					return;
				}

				workflowManager.updateNodeData(nodeId, (prev) => {
					const prevData = prev as JunctionData;
					const dataToChange: Partial<JunctionData> = {};
					if (pivotSelected) {
						const newPosition = resolvePivotPosition(
							prevData.pivotPosition + step,
							width,
						);
						if (newPosition != null) dataToChange.pivotPosition = newPosition;
					}
					if (selectedBranchId != null) {
						const newPosition = resolveBranchPosition(
							prevData,
							selectedBranchId,
							prevData.branches[selectedBranchId]!.position + step,
							width,
						);
						if (newPosition != null) {
							dataToChange.branches = {
								...prevData.branches,
								[selectedBranchId]: {
									...prevData.branches[selectedBranchId]!,
									position: newPosition,
								},
							};
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
			workflowManager,
			updatenodeInternals,
			width,
			nodeX,
			data,
		],
	);
}
