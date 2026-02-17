"use client";

import { JunctionData } from "@/schemas/grafcet/Junction.class";
import { useEffect, useState } from "react";
import { JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH } from "./JunctionNodeBranchAddButton";

export default function useBranchAddButtonsPositions(nodeData: JunctionData) {
	const [branchAddButtonsPositions, setBranchAddButtonsPositions] = useState<number[]>([]);
	//Calculate the positions for the add branch buttons
	useEffect(() => {
		if (nodeData.branchesOrder.length == 0) {
			setBranchAddButtonsPositions([nodeData.width / 2]);
			return;
		}
		const buttonsPositions = [];
		if (nodeData.branches[nodeData.branchesOrder[0]].position <= JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH)
			buttonsPositions.push(-JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH / 2);
		else buttonsPositions.push(nodeData.branches[nodeData.branchesOrder[0]].position / 2);
		for (let i = 1; i < nodeData.branchesOrder.length; i++) {
			buttonsPositions.push(
				(nodeData.branches[nodeData.branchesOrder[i - 1]].position +
					nodeData.branches[nodeData.branchesOrder[i]].position) /
					2,
			);
		}
		if (
			nodeData.width -
				nodeData.branches[nodeData.branchesOrder[nodeData.branchesOrder.length - 1]].position <=
			JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH
		)
			buttonsPositions.push(nodeData.width + JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH / 2);
		else
			buttonsPositions.push(
				(nodeData.branches[nodeData.branchesOrder[nodeData.branchesOrder.length - 1]].position +
					nodeData.width) /
					2,
			);
		setBranchAddButtonsPositions(buttonsPositions);
	}, [nodeData.width, nodeData.branchesOrder, nodeData.branches]);

	return branchAddButtonsPositions;
}
