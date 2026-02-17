"use client";

import { FLOW_GRID_CELL_WIDTH } from "@/constants";
import { JunctionData } from "@/schemas/grafcet/Junction.class";
import { useUpdateNodeInternals } from "@xyflow/react";
import { useCallback } from "react";
import { useGrafcetStore } from "../../context/GrafcetContext";

export default function useBranchActions(
	nodeId: string,
	nodeData: JunctionData,
): { add: (buttonIndex: number) => void } {
	const updateNodeData = useGrafcetStore((state) => state.updateNodeData);
	const updateNodeInternals = useUpdateNodeInternals();

	const add = useCallback(
		(buttonIndex: number) => {
			let newBranchPosition = 0;
			if (nodeData.branchesPositions.length == 0) newBranchPosition = nodeData.width / 2;
			else {
				if (buttonIndex == 0) newBranchPosition = nodeData.branchesPositions[0] / 2;
				else if (buttonIndex == nodeData.branchesPositions.length)
					newBranchPosition =
						(nodeData.branchesPositions[nodeData.branchesPositions.length - 1] + nodeData.width) /
						2;
				else {
					newBranchPosition =
						(nodeData.branchesPositions[buttonIndex - 1] +
							nodeData.branchesPositions[buttonIndex]) /
						2;
				}
			}
			if (newBranchPosition % FLOW_GRID_CELL_WIDTH != 0)
				//Align to the grid
				newBranchPosition = newBranchPosition - (newBranchPosition % FLOW_GRID_CELL_WIDTH);
			const newBranchesPositions = [...nodeData.branchesPositions];
			newBranchesPositions.splice(buttonIndex, 0, newBranchPosition);
			updateNodeData(nodeId, { branchesPositions: newBranchesPositions });
			updateNodeInternals(nodeId);
		},
		[nodeData.branchesPositions, nodeData.width, updateNodeData, nodeId, updateNodeInternals],
	);

	return { add };
}
