'use client'

import { useCallback } from "react"
import { useGrafcetToolbarDnD } from "./toolbar/GrafcetToolbarDnDContext"
import { useReactFlow } from "@xyflow/react"
import { GrafcetNode, nodesDefaultData, nodesDefaultDimensions } from "./grafcet-nodes-definitions"
import { createElementId } from "@/schemas/schemas-helpers"
import { useProjectContext } from "../projects/ProjectContext"
import { useGrafcetContext } from "./GrafcetContext"

export default function useFlowToolDragOverHandlers(): [handleToolDragOver: (e: React.DragEvent) => void, handleToolDrop: (e: React.DragEvent) => void]{
	const {grafcetId} = useGrafcetContext()
	const [toolType] = useGrafcetToolbarDnD()
	const {screenToFlowPosition, setNodes } = useReactFlow()
	const {grafcetEvents} = useProjectContext()

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
		grafcetEvents.emit("node-add", {grafcetId: grafcetId, ...newNode})
	}, [grafcetId, toolType, grafcetEvents])

	return [handleToolDragOver, handleToolDrop]
}