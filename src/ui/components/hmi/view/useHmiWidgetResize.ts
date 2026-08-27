"use client";

import {
	HMI_CANVAS_HEIGHT,
	HMI_CANVAS_WIDTH,
} from "@/schemas/hmi/hmi-page.schema";
import {
	HMI_WIDGET_DEFINITIONS,
	HmiWidget,
	HmiWidgetSize,
} from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { MouseEvent as ReactMouseEvent, useRef } from "react";
import { snapToGrid } from "./constants";

/** Plancher appliqué quand le type de widget ne définit pas de `minSize` (ex. gauge : sa taille
 * stockée reste "comme si horizontal" quelle que soit son orientation affichée, voir
 * `HmiWidgetPropertiesPanel` — une seule taille minimale n'aurait donc pas de sens). Suffisant pour
 * qu'un widget reste manipulable (visible, attrapable), sans prétendre borner un rendu correct. */
const DEFAULT_MIN_SIZE: HmiWidgetSize = { width: 30, height: 30 };

/**
 * Redimensionnement d'un widget par sa poignée, borné par sa taille minimale
 * (`HMI_WIDGET_DEFINITIONS`) et par les limites du canvas. Quand un ratio largeur/hauteur
 * s'applique (`HmiWidget.getResizeAspectRatio` — imposé par le type, ex. voyant carré, ou choisi
 * par l'utilisateur pour une ellipse, voir `EllipseData.lockAspectRatio`), le redimensionnement
 * n'a plus qu'un seul degré de liberté : l'axe où la souris se déplace le plus pilote, l'autre
 * dimension en découle.
 *
 * Comme `useHmiWidgetDrag`, ne touche le store qu'une seule fois au relâchement (`updateWidget`)
 * — les tailles intermédiaires ne sont qu'un aperçu visuel local (`onPreviewChange`), pour ne
 * pas remplir la pile d'annulation d'une commande par frame de redimensionnement.
 */
export default function useHmiWidgetResize(
	zoom: number,
	onPreviewChange: (size: HmiWidgetSize | null) => void,
) {
	const updateWidget = useHmiStore((s) => s.updateWidget);

	const resizeState = useRef<{
		widgetId: string;
		startMouseX: number;
		startMouseY: number;
		startWidth: number;
		startHeight: number;
	} | null>(null);

	return (e: ReactMouseEvent, widget: HmiWidget) => {
		const { minSize = DEFAULT_MIN_SIZE } = HMI_WIDGET_DEFINITIONS[widget.type];
		const aspectRatio = HmiWidget.getResizeAspectRatio(widget);
		resizeState.current = {
			widgetId: widget.id,
			startMouseX: e.clientX,
			startMouseY: e.clientY,
			startWidth: widget.size.width,
			startHeight: widget.size.height,
		};

		const clampedSize = (
			clientX: number,
			clientY: number,
			resize: NonNullable<typeof resizeState.current>,
		) => {
			const dx = (clientX - resize.startMouseX) / zoom;
			const dy = (clientY - resize.startMouseY) / zoom;
			const maxWidth = HMI_CANVAS_WIDTH - widget.position.x;
			const maxHeight = HMI_CANVAS_HEIGHT - widget.position.y;

			if (aspectRatio) {
				const minSide = Math.max(minSize.width, minSize.height * aspectRatio);
				const maxSide = Math.min(maxWidth, maxHeight * aspectRatio);
				const rawSide =
					Math.abs(dx) >= Math.abs(dy)
						? resize.startWidth + dx
						: (resize.startHeight + dy) * aspectRatio;
				const side = snapToGrid(Math.max(minSide, Math.min(maxSide, rawSide)));
				return { width: side, height: side / aspectRatio };
			}
			return {
				width: snapToGrid(
					Math.max(minSize.width, Math.min(maxWidth, resize.startWidth + dx)),
				),
				height: snapToGrid(
					Math.max(
						minSize.height,
						Math.min(maxHeight, resize.startHeight + dy),
					),
				),
			};
		};

		const onMouseMove = (moveEvent: MouseEvent) => {
			const resize = resizeState.current;
			if (!resize) return;
			onPreviewChange(
				clampedSize(moveEvent.clientX, moveEvent.clientY, resize),
			);
		};
		const onMouseUp = (upEvent: MouseEvent) => {
			const resize = resizeState.current;
			resizeState.current = null;
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
			onPreviewChange(null);
			if (!resize) return;
			updateWidget(resize.widgetId, {
				size: clampedSize(upEvent.clientX, upEvent.clientY, resize),
			});
		};
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
	};
}
