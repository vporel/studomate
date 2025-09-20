'use client'

import { useReactFlow, useStore, useUpdateNodeInternals } from "@xyflow/react";
import React, { useCallback } from "react";
import { JunctionNodeData, JunctionNodeType } from "./JunctionNode";
import { FLOW_GRID_CELL_WIDTH } from "@/constants";

export default function useBarMoveHandler(nodeId: string, pivotSelected: boolean, selectedBranchIndex: number): (e: React.KeyboardEvent<HTMLDivElement>) => void{
	const {updateNodeData} = useReactFlow()
	const updatenodeInternals = useUpdateNodeInternals()
	
	return useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
		if(!pivotSelected && selectedBranchIndex == -1) return;
		const toLeft = e.key == "ArrowLeft" 
		const toRight = e.key == "ArrowRight"
		if(toLeft || toRight){
			e.stopPropagation()
			updateNodeData(nodeId, n => {
				const node = n as JunctionNodeType
				const dataToChange: Partial<JunctionNodeData> = {}
				if(pivotSelected){
					const newPosition = node.data.pivotPosition + (FLOW_GRID_CELL_WIDTH * (toLeft ? -1 : 1))
					if(newPosition >= FLOW_GRID_CELL_WIDTH && newPosition <= node.data.width - FLOW_GRID_CELL_WIDTH){
						dataToChange.pivotPosition = newPosition
					}
				}
				if(selectedBranchIndex != -1){
					const newPosition = node.data.branchesPositions[selectedBranchIndex] + (FLOW_GRID_CELL_WIDTH * (toLeft ? -1 : 1))
					if(newPosition >= FLOW_GRID_CELL_WIDTH && newPosition <= node.data.width - FLOW_GRID_CELL_WIDTH && !node.data.branchesPositions.includes(newPosition)){
						dataToChange.branchesPositions = [...node.data.branchesPositions]
						dataToChange.branchesPositions[selectedBranchIndex] = newPosition
					}
				}
				return dataToChange
			})
			updatenodeInternals(nodeId)
		}
	}, [nodeId, pivotSelected,  selectedBranchIndex, updateNodeData])
}