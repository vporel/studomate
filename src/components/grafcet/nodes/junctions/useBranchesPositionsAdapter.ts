'use client'

import { useEffect, useRef } from "react"
import { JunctionNodeData, JunctionNodeType } from "./JunctionNode"
import { useReactFlow, useUpdateNodeInternals } from "@xyflow/react"

export default function useBranchesPositionsAdapter(nodeId: string, nodeWidth: number|undefined, nodePositionAbsoluteX: number){
	const {updateNodeData} = useReactFlow()
	const oldWidth = useRef(nodeWidth)
	const oldPositionAbsoluteX = useRef(nodePositionAbsoluteX)
	const updatenodeInternals = useUpdateNodeInternals()

	//Update de branches positions when the node is resized
	useEffect(() => {
		if(nodeWidth != oldWidth.current){
			updateNodeData(nodeId, n => {
				const node = n as JunctionNodeType
				const dataToChange: Partial<JunctionNodeData> = {}
				if(nodeWidth != 0) dataToChange.width = nodeWidth
				if(nodePositionAbsoluteX != oldPositionAbsoluteX.current){
					const positionDelta = oldPositionAbsoluteX.current - nodePositionAbsoluteX
					dataToChange.pivotPosition = node.data.pivotPosition + positionDelta
					dataToChange.branchesPositions = node.data.branchesPositions.map(p => p + positionDelta)
					oldPositionAbsoluteX.current = nodePositionAbsoluteX
				}
				return dataToChange
			})
			updatenodeInternals(nodeId)
			oldWidth.current = nodeWidth
		}
	}, [nodeId, nodeWidth, nodePositionAbsoluteX, updateNodeData])
}