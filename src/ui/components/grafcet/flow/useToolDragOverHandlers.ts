"use client";

import { createRandomId } from "@/ids";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { useGrafcetStore } from "../context/GrafcetContext";
import { useGrafcetToolbarDnD } from "../toolbar/GrafcetToolbarDnDContext";
import {
	GrafcetNodeType,
	GRAFCET_ELEMENTS_CONFIG,
} from "./grafcet-nodes-definitions";

export default function useToolDragOverHandlers(): [
	handleToolDragOver: (e: React.DragEvent) => void,
	handleToolDrop: (e: React.DragEvent) => void,
] {
	const { draggedElement } = useGrafcetToolbarDnD();
	const { screenToFlowPosition } = useReactFlow();
	const workflowManager = useGrafcetStore((state) => state.workflowManager);

	const handleToolDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	}, []);

	const handleToolDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			if (!draggedElement) return;
			const { type } = draggedElement;
			const elementClass = GRAFCET_ELEMENTS_CONFIG[type].elementClass;
			const position = screenToFlowPosition({ x: e.pageX, y: e.pageY });
			position.x = position.x - elementClass.DEFAULT_DIMENSIONS.width / 2;
			position.y = position.y - elementClass.DEFAULT_DIMENSIONS.height / 2;
			const newNode = {
				id: createRandomId(),
				type,
				position,
				data: elementClass.generateDefaultData(
					type === "step" ? draggedElement.extraData : undefined,
				),
				width: elementClass.DEFAULT_DIMENSIONS.width,
				height: elementClass.DEFAULT_DIMENSIONS.height,
			} as GrafcetNodeType;
			workflowManager.addNodes([newNode]);
		},
		[draggedElement, screenToFlowPosition, workflowManager],
	);

	return [handleToolDragOver, handleToolDrop];
}
