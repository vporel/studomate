"use client";

import { createRandomId } from "@/schemas/schemas-helpers";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { useGrafcetStore } from "../context/GrafcetContext";
import { useGrafcetToolbarDnD } from "../toolbar/GrafcetToolbarDnDContext";
import {
	GrafcetNodeType,
	NODES_DEFAULT_DATA_GENERATORS,
	NODES_DEFAULT_DIMENSIONS,
} from "./grafcet-nodes-definitions";

export default function useToolDragOverHandlers(): [
	handleToolDragOver: (e: React.DragEvent) => void,
	handleToolDrop: (e: React.DragEvent) => void,
] {
	const { type: toolType, extraData: toolExtraData } = useGrafcetToolbarDnD();
	const { screenToFlowPosition } = useReactFlow();
	const workflowManager = useGrafcetStore((state) => state.workflowManager);

	const handleToolDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	}, []);

	const handleToolDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			if (!toolType) return;
			const position = screenToFlowPosition({ x: e.pageX, y: e.pageY });
			position.x = position.x - NODES_DEFAULT_DIMENSIONS[toolType].width / 2;
			position.y = position.y - NODES_DEFAULT_DIMENSIONS[toolType].height / 2;
			const newNode = {
				id: createRandomId(),
				type: toolType,
				position,
				data: NODES_DEFAULT_DATA_GENERATORS[toolType](toolExtraData),
			} as GrafcetNodeType;
			workflowManager.addNodes([newNode]);
		},
		[toolType, screenToFlowPosition, workflowManager, toolExtraData],
	);

	return [handleToolDragOver, handleToolDrop];
}
