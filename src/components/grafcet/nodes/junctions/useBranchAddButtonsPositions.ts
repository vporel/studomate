"use client";

import { JunctionData } from "@/schemas/grafcet/junction.class";
import { useEffect, useState } from "react";
import { JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH } from "./JunctionNodeBranchAddButton";

export default function useBranchAddButtonsPositions(nodeData: JunctionData) {
	const [branchAddButtonsPositions, setBranchAddButtonsPositions] = useState<number[]>([]);
	//Calculate the positions for the add branch buttons
	useEffect(() => {
		if (nodeData.branchesPositions.length == 0) {
			setBranchAddButtonsPositions([nodeData.width / 2]);
			return;
		}
		const buttonsPositions = [];
		if (nodeData.branchesPositions[0] <= JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH)
			buttonsPositions.push(-JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH / 2);
		else buttonsPositions.push(nodeData.branchesPositions[0] / 2);
		for (let i = 1; i < nodeData.branchesPositions.length; i++) {
			buttonsPositions.push((nodeData.branchesPositions[i - 1] + nodeData.branchesPositions[i]) / 2);
		}
		if (
			nodeData.width - nodeData.branchesPositions[nodeData.branchesPositions.length - 1] <=
			JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH
		)
			buttonsPositions.push(nodeData.width + JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH / 2);
		else
			buttonsPositions.push(
				(nodeData.branchesPositions[nodeData.branchesPositions.length - 1] + nodeData.width) / 2,
			);
		setBranchAddButtonsPositions(buttonsPositions);
	}, [nodeData.width, nodeData.branchesPositions]);

	return branchAddButtonsPositions;
}
