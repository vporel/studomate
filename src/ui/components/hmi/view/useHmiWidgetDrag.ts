"use client";

import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import {
	HMI_CANVAS_HEIGHT,
	HMI_CANVAS_WIDTH,
} from "@/schemas/hmi/hmi-page.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { MouseEvent as ReactMouseEvent, useRef } from "react";
import { snapToGrid } from "./constants";

export interface HmiDragPreview {
	widgetIds: string[];
	dx: number;
	dy: number;
}

/**
 * Déplacement d'un groupe de widgets (la sélection complète) par glisser. Ne touche le store
 * qu'une seule fois, au relâchement (`moveWidgets`, une commande annulable pour tout le
 * groupe) — les positions intermédiaires ne sont qu'un aperçu visuel local, communiqué via
 * `onPreviewChange` à `HmiCanvas`, pour ne pas remplir la pile d'annulation d'une commande par
 * frame de glissement (voir `useHmiWidgetResize`, même principe).
 */
export default function useHmiWidgetDrag(
	zoom: number,
	onPreviewChange: (preview: HmiDragPreview | null) => void,
) {
	const moveWidgets = useHmiStore((s) => s.moveWidgets);

	const dragState = useRef<{
		widgetIds: string[];
		startMouseX: number;
		startMouseY: number;
		//Boîte englobante du groupe au début du glisser — borne le delta pour qu'aucun widget du
		//groupe ne sorte du canvas, pas seulement celui saisi.
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
	} | null>(null);

	return (e: ReactMouseEvent, group: HmiWidget[]) => {
		const minX = Math.min(...group.map((w) => w.position.x));
		const minY = Math.min(...group.map((w) => w.position.y));
		const maxX = Math.max(...group.map((w) => w.position.x + w.size.width));
		const maxY = Math.max(...group.map((w) => w.position.y + w.size.height));
		dragState.current = {
			widgetIds: group.map((w) => w.id),
			startMouseX: e.clientX,
			startMouseY: e.clientY,
			minX,
			minY,
			maxX,
			maxY,
		};

		const clampedDelta = (
			clientX: number,
			clientY: number,
			drag: NonNullable<typeof dragState.current>,
		) => {
			const rawDx = (clientX - drag.startMouseX) / zoom;
			const rawDy = (clientY - drag.startMouseY) / zoom;
			const dx = snapToGrid(
				Math.max(-drag.minX, Math.min(HMI_CANVAS_WIDTH - drag.maxX, rawDx)),
			);
			const dy = snapToGrid(
				Math.max(-drag.minY, Math.min(HMI_CANVAS_HEIGHT - drag.maxY, rawDy)),
			);
			return { dx, dy };
		};

		const onMouseMove = (moveEvent: MouseEvent) => {
			const drag = dragState.current;
			if (!drag) return;
			const { dx, dy } = clampedDelta(
				moveEvent.clientX,
				moveEvent.clientY,
				drag,
			);
			onPreviewChange({ widgetIds: drag.widgetIds, dx, dy });
		};

		const onMouseUp = (upEvent: MouseEvent) => {
			const drag = dragState.current;
			dragState.current = null;
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
			onPreviewChange(null);
			if (!drag) return;
			const { dx, dy } = clampedDelta(upEvent.clientX, upEvent.clientY, drag);
			moveWidgets(drag.widgetIds, dx, dy);
		};

		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
	};
}
