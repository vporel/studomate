'use client'

import { useCallback } from "react"
import { useGrafcetToolbarDnD } from "./toolbar/GrafcetToolbarDnDContext"
import { useReactFlow } from "@xyflow/react"
import { GrafcetNode, nodesDefaultData, nodesDefaultDimensions } from "./grafcet-nodes-definitions"
import { createElementId } from "@/schemas/schemas-helpers"

export default function useFlowToolDragOverHandlers(): [handleToolDragOver: (e: React.DragEvent) => void, handleToolDrop: (e: React.DragEvent) => void]{
	const [toolType] = useGrafcetToolbarDnD()
	const {screenToFlowPosition, setNodes} = useReactFlow()

	const handleToolDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.dataTransfer.dropEffect = "move"
	}, [])
	
	const handleToolDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		if(!toolType) return
		const position = screenToFlowPosition({x: e.pageX, y:e.pageY})
		position.x = position.x - (nodesDefaultDimensions[toolType].width/2)
		position.y = position.y - (nodesDefaultDimensions[toolType].height/2)
		const newNode = {
		  id: createElementId(),
		  type: toolType,
		  position,
		  data: nodesDefaultData[toolType]
		} as GrafcetNode
		setNodes(nds => nds.concat([newNode]))
	}, [toolType])

	return [handleToolDragOver, handleToolDrop]
}