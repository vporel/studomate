"use client";

import { FLOW_GRID_CELL_WIDTH } from "@/constants";
import { JunctionData } from "@/schemas/grafcet/Junction.class";
import { createRandomId } from "@/schemas/schemas-helpers";
import { useUpdateNodeInternals } from "@xyflow/react";
import { useCallback } from "react";
import { useGrafcetStore } from "../../../context/GrafcetContext";

export default function useBranchActions(
	nodeId: string,
	nodeData: JunctionData,
): { add: (buttonIndex: number) => void } {
	const workflowManager = useGrafcetStore((state) => state.workflowManager);
	const updateNodeInternals = useUpdateNodeInternals();

	const add = useCallback(
		(buttonIndex: number) => {
			let newBranchPosition = 0;
			if (nodeData.branchesOrder.length == 0) newBranchPosition = nodeData.width / 2;
			else {
				if (buttonIndex == 0)
					newBranchPosition = nodeData.branches[nodeData.branchesOrder[0]]!.position / 2;
				else if (buttonIndex == nodeData.branchesOrder.length)
					newBranchPosition =
						(nodeData.branches[nodeData.branchesOrder[nodeData.branchesOrder.length - 1]]!
							.position +
							nodeData.width) /
						2;
				else {
					newBranchPosition =
						(nodeData.branches[nodeData.branchesOrder[buttonIndex - 1]]!.position +
							nodeData.branches[nodeData.branchesOrder[buttonIndex]]!.position) /
						2;
				}
			}
			if (newBranchPosition % FLOW_GRID_CELL_WIDTH != 0)
				//Align to the grid
				newBranchPosition = newBranchPosition - (newBranchPosition % FLOW_GRID_CELL_WIDTH);
			const newBranch = {
				id: createRandomId(),
				position: newBranchPosition,
			};
			const newBranches = { ...nodeData.branches, [newBranch.id]: newBranch };
			const newBranchesOrder = [...nodeData.branchesOrder];
			newBranchesOrder.splice(buttonIndex, 0, newBranch.id);
			workflowManager.updateNodeData(nodeId, {
				branches: newBranches,
				branchesOrder: newBranchesOrder,
			});
			updateNodeInternals(nodeId);
		},
		[
			nodeData.branches,
			nodeData.branchesOrder,
			nodeData.width,
			workflowManager,
			nodeId,
			updateNodeInternals,
		],
	);

	return { add };
}
