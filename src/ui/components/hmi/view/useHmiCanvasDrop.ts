"use client";

import { HMI_CANVAS_HEIGHT, HMI_CANVAS_WIDTH } from "@/schemas/hmi/hmi-page.schema";
import { HMI_WIDGET_DEFINITIONS } from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { useHmiWidgetDnD } from "@/ui/components/hmi/toolbar/HmiWidgetDnDContext";
import { DragEvent as ReactDragEvent } from "react";
import { snapToGrid } from "./constants";

/**
 * Dépose sur le canvas d'un widget glissé depuis la toolbar (voir `HmiWidgetDnDContext`,
 * partagé entre palette et canvas) — le widget est centré sur le point de dépose, borné aux
 * limites du canvas.
 */
export default function useHmiCanvasDrop(
	zoom: number,
	isSimulation: boolean,
): [onDragOver: (e: ReactDragEvent<HTMLDivElement>) => void, onDrop: (e: ReactDragEvent<HTMLDivElement>) => void] {
	const addWidget = useHmiStore((s) => s.addWidget);
	const { draggedTool } = useHmiWidgetDnD();

	const onDragOver = (e: ReactDragEvent<HTMLDivElement>) => {
		if (isSimulation || !draggedTool) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
	};

	const onDrop = (e: ReactDragEvent<HTMLDivElement>) => {
		if (isSimulation || !draggedTool) return;
		e.preventDefault();
		const rect = e.currentTarget.getBoundingClientRect();
		const rawX = (e.clientX - rect.left) / zoom;
		const rawY = (e.clientY - rect.top) / zoom;
		const size = draggedTool.sizeOverride ?? HMI_WIDGET_DEFINITIONS[draggedTool.type].defaultSize;
		const x = snapToGrid(Math.max(0, Math.min(HMI_CANVAS_WIDTH - size.width, rawX - size.width / 2)));
		const y = snapToGrid(Math.max(0, Math.min(HMI_CANVAS_HEIGHT - size.height, rawY - size.height / 2)));
		addWidget(draggedTool.type, x, y, draggedTool.sizeOverride, draggedTool.dataOverride);
	};

	return [onDragOver, onDrop];
}
