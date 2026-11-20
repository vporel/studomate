"use client";

import { createRandomId } from "@/ids";
import { useT } from "@/ui/i18n/useT";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { useGrafcetStore } from "../context/GrafcetContext";
import { useGrafcetToolbarDnD } from "../toolbar/GrafcetToolbarDnDContext";
import newElementData from "../toolbar/new-element-data";
import {
	type GrafcetElementsTranslator,
	grafcetElementTypeLabel,
} from "./describe-grafcet-element";
import {
	GrafcetNodeType,
	GRAFCET_ELEMENTS_CONFIG,
} from "./grafcet-nodes-definitions";

export default function useToolDragOverHandlers(): [
	handleToolDragOver: (e: React.DragEvent) => void,
	handleToolDrop: (e: React.DragEvent) => void,
] {
	const { draggedItem } = useGrafcetToolbarDnD();
	const { screenToFlowPosition } = useReactFlow();
	const workflowManager = useGrafcetStore((state) => state.workflowManager);
	const t = useT(
		"grafcetEditor.elements",
	) as unknown as GrafcetElementsTranslator;

	const handleToolDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	}, []);

	const handleToolDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			if (!draggedItem) return;
			const { type } = draggedItem;
			const elementClass = GRAFCET_ELEMENTS_CONFIG[type].elementClass;
			const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
			position.x = position.x - elementClass.DEFAULT_DIMENSIONS.width / 2;
			position.y = position.y - elementClass.DEFAULT_DIMENSIONS.height / 2;
			const newNode = {
				id: createRandomId(),
				type,
				position,
				data: newElementData(
					draggedItem,
					elementClass,
					grafcetElementTypeLabel("comment", t),
				),
				width: elementClass.DEFAULT_DIMENSIONS.width,
				height: elementClass.DEFAULT_DIMENSIONS.height,
			} as GrafcetNodeType;
			workflowManager.addDroppedNode(newNode);
		},
		[draggedItem, screenToFlowPosition, workflowManager, t],
	);

	return [handleToolDragOver, handleToolDrop];
}
