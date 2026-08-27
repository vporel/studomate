"use client";

import {
	HMI_CANVAS_HEIGHT,
	HMI_CANVAS_WIDTH,
} from "@/schemas/hmi/hmi-page.schema";
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { MouseEvent as ReactMouseEvent, RefObject, useRef } from "react";

export interface HmiMarqueeRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export function intersects(widget: HmiWidget, rect: HmiMarqueeRect): boolean {
	return (
		widget.position.x < rect.x + rect.width &&
		widget.position.x + widget.size.width > rect.x &&
		widget.position.y < rect.y + rect.height &&
		widget.position.y + widget.size.height > rect.y
	);
}

/**
 * Sélection rectangulaire au glisser sur une zone vide du canvas — au relâchement, tout widget
 * dont la boîte englobante intersecte le rectangle rejoint la sélection. Additif (Shift/Ctrl/Cmd,
 * même convention que le clic sur un widget — voir `HmiCanvas.handleWidgetDragStart`) : le
 * résultat s'ajoute alors à la sélection déjà en cours plutôt que de la remplacer.
 */
export default function useHmiMarqueeSelect(
	canvasWrapperRef: RefObject<HTMLDivElement | null>,
	zoom: number,
	widgets: HmiWidget[],
	setSelection: (widgetIds: string[]) => void,
	onPreviewChange: (rect: HmiMarqueeRect | null) => void,
) {
	const dragState = useRef<{
		startX: number;
		startY: number;
		additiveBase: string[];
	} | null>(null);

	const clientToCanvas = (clientX: number, clientY: number) => {
		const el = canvasWrapperRef.current;
		if (!el) return { x: 0, y: 0 };
		const rect = el.getBoundingClientRect();
		return {
			x: Math.max(0, Math.min(HMI_CANVAS_WIDTH, (clientX - rect.left) / zoom)),
			y: Math.max(0, Math.min(HMI_CANVAS_HEIGHT, (clientY - rect.top) / zoom)),
		};
	};

	return (e: ReactMouseEvent, currentSelection: string[]) => {
		const start = clientToCanvas(e.clientX, e.clientY);
		const additive = e.shiftKey || e.ctrlKey || e.metaKey;
		dragState.current = {
			startX: start.x,
			startY: start.y,
			additiveBase: additive ? currentSelection : [],
		};

		const rectFrom = (
			current: { x: number; y: number },
			drag: NonNullable<typeof dragState.current>,
		): HmiMarqueeRect => ({
			x: Math.min(drag.startX, current.x),
			y: Math.min(drag.startY, current.y),
			width: Math.abs(current.x - drag.startX),
			height: Math.abs(current.y - drag.startY),
		});

		const onMouseMove = (moveEvent: MouseEvent) => {
			const drag = dragState.current;
			if (!drag) return;
			onPreviewChange(
				rectFrom(clientToCanvas(moveEvent.clientX, moveEvent.clientY), drag),
			);
		};

		const onMouseUp = (upEvent: MouseEvent) => {
			const drag = dragState.current;
			dragState.current = null;
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
			onPreviewChange(null);
			if (!drag) return;
			const rect = rectFrom(
				clientToCanvas(upEvent.clientX, upEvent.clientY),
				drag,
			);
			// Glisser nul (simple clic) : laissé au `onClick` du canvas, qui vide la sélection.
			if (rect.width === 0 && rect.height === 0) return;
			const hit = widgets.filter((w) => intersects(w, rect)).map((w) => w.id);
			setSelection(Array.from(new Set([...drag.additiveBase, ...hit])));
		};

		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
	};
}
