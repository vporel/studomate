"use client";

import { createElementId } from "@/schemas/schemas-helpers";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { useGrafcetContext } from "../context/GrafcetContext";
import { useGrafcetToolbarDnD } from "../toolbar/GrafcetToolbarDnDContext";
import { GrafcetNode, nodesDefaultData, nodesDefaultDimensions } from "./grafcet-nodes-definitions";

export default function useToolDragOverHandlers(): [
	handleToolDragOver: (e: React.DragEvent) => void,
	handleToolDrop: (e: React.DragEvent) => void
] {
	const { elementsEvents } = useGrafcetContext();
	const [toolType] = useGrafcetToolbarDnD();
	const { screenToFlowPosition, setNodes } = useReactFlow();

	const handleToolDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	}, []);

	const handleToolDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			if (!toolType) return;
			const position = screenToFlowPosition({ x: e.pageX, y: e.pageY });
			position.x = position.x - nodesDefaultDimensions[toolType].width / 2;
			position.y = position.y - nodesDefaultDimensions[toolType].height / 2;
			const newNode = {
				id: createElementId(),
				type: toolType,
				position,
				data: nodesDefaultData[toolType],
			} as GrafcetNode;
			setNodes((nds) => nds.concat([newNode]));
			elementsEvents.emit("add", [newNode]);
		},
		[toolType, elementsEvents, screenToFlowPosition, setNodes]
	);

	return [handleToolDragOver, handleToolDrop];
}
