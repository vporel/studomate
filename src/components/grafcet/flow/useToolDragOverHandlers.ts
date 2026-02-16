"use client";

import { createElementId } from "@/schemas/schemas-helpers";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { useGrafcetStore } from "../context/GrafcetContext";
import { useGrafcetToolbarDnD } from "../toolbar/GrafcetToolbarDnDContext";
import { GrafcetNode, NODES_DEFAULT_DATA, NODES_DEFAULT_DIMENSIONS } from "./grafcet-nodes-definitions";

export default function useToolDragOverHandlers(): [
	handleToolDragOver: (e: React.DragEvent) => void,
	handleToolDrop: (e: React.DragEvent) => void,
] {
	const [toolType] = useGrafcetToolbarDnD();
	const { screenToFlowPosition } = useReactFlow();
	const { addNodes } = useGrafcetStore(useShallow((state) => ({ addNodes: state.addNodes })));

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
				id: createElementId(),
				type: toolType,
				position,
				data: NODES_DEFAULT_DATA[toolType],
			} as GrafcetNode;
			addNodes([newNode]);
		},
		[toolType, screenToFlowPosition, addNodes],
	);

	return [handleToolDragOver, handleToolDrop];
}
