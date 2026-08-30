"use client";

import {
	HMI_CANVAS_HEIGHT,
	HMI_CANVAS_WIDTH,
} from "@/schemas/hmi/hmi-page.schema";
import {
	HMI_WIDGET_DEFINITIONS,
	HmiWidget,
	HmiWidgetPosition,
	HmiWidgetSize,
} from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { MouseEvent as ReactMouseEvent, useRef } from "react";
import { HMI_WIDGET_DEFAULT_MIN_SIZE, snapToGrid } from "./constants";

/** Poignée de redimensionnement : un point cardinal. `n`/`s`/`e`/`w` déplacent un seul bord, les
 * coins (`ne`, `nw`, `se`, `sw`) deux à la fois. Un bord non cité dans la direction reste ancré. */
export type HmiResizeDirection =
	| "n"
	| "s"
	| "e"
	| "w"
	| "ne"
	| "nw"
	| "se"
	| "sw";

/** Rectangle d'un widget pendant un redimensionnement en cours (position + taille) : `position`
 * change dès qu'un bord haut/gauche bouge, l'aperçu doit donc porter les deux. */
export interface HmiWidgetRect {
	position: HmiWidgetPosition;
	size: HmiWidgetSize;
}

/**
 * Nouveau rectangle d'un widget redimensionné par la poignée `direction`, la souris ayant bougé de
 * `(dx, dy)` px canvas depuis le début du geste. Le bord (ou coin) opposé à la poignée reste fixe :
 * une poignée nord ou ouest fait donc bouger `position` autant que `size`. Borné par `minSize` et
 * par les limites du canvas.
 *
 * Avec `aspectRatio` (largeur/hauteur imposé par le type — voyant carré — ou choisi pour une
 * ellipse, voir `HmiWidget.getResizeAspectRatio`), un seul degré de liberté subsiste : pour un
 * coin, l'axe où la souris se déplace le plus pilote ; pour un bord, ce bord pilote ; l'autre
 * dimension en découle, ancrée sur le même coin.
 */
export function resizeRect(params: {
	direction: HmiResizeDirection;
	start: { x: number; y: number; width: number; height: number };
	dx: number;
	dy: number;
	minSize: HmiWidgetSize;
	aspectRatio?: number;
}): HmiWidgetRect {
	const { direction, start, dx, dy, minSize, aspectRatio } = params;
	const movesLeft = direction.includes("w");
	const movesRight = direction.includes("e");
	const movesTop = direction.includes("n");
	const movesBottom = direction.includes("s");

	const right = start.x + start.width;
	const bottom = start.y + start.height;
	// Marge disponible du côté du canvas vers lequel le bord mobile progresse.
	const roomX = movesLeft ? right : HMI_CANVAS_WIDTH - start.x;
	const roomY = movesTop ? bottom : HMI_CANVAS_HEIGHT - start.y;

	if (aspectRatio) {
		const minSide = Math.max(minSize.width, minSize.height * aspectRatio);
		const maxSide = Math.min(roomX, roomY * aspectRatio);
		const widthDelta = movesLeft ? -dx : dx;
		const heightDelta = movesTop ? -dy : dy;
		const hasHorizontal = movesLeft || movesRight;
		const hasVertical = movesTop || movesBottom;
		const drivenByWidth =
			hasHorizontal && (!hasVertical || Math.abs(dx) >= Math.abs(dy));
		const rawSide = drivenByWidth
			? start.width + widthDelta
			: (start.height + heightDelta) * aspectRatio;
		const width = snapToGrid(Math.max(minSide, Math.min(maxSide, rawSide)));
		const height = width / aspectRatio;
		return {
			size: { width, height },
			position: {
				x: movesLeft ? right - width : start.x,
				y: movesTop ? bottom - height : start.y,
			},
		};
	}

	let x = start.x;
	let width = start.width;
	if (movesRight) {
		width = snapToGrid(
			Math.max(minSize.width, Math.min(roomX, start.width + dx)),
		);
	} else if (movesLeft) {
		x = snapToGrid(
			Math.max(0, Math.min(right - minSize.width, start.x + dx)),
		);
		width = right - x;
	}

	let y = start.y;
	let height = start.height;
	if (movesBottom) {
		height = snapToGrid(
			Math.max(minSize.height, Math.min(roomY, start.height + dy)),
		);
	} else if (movesTop) {
		y = snapToGrid(
			Math.max(0, Math.min(bottom - minSize.height, start.y + dy)),
		);
		height = bottom - y;
	}

	return { position: { x, y }, size: { width, height } };
}

/**
 * Redimensionnement d'un widget par l'une de ses huit poignées.
 *
 * Comme `useHmiWidgetDrag`, ne touche le store qu'une seule fois au relâchement (`updateWidget`)
 * — les rectangles intermédiaires ne sont qu'un aperçu visuel local (`onPreviewChange`), pour ne
 * pas remplir la pile d'annulation d'une commande par frame de redimensionnement.
 */
export default function useHmiWidgetResize(
	zoom: number,
	onPreviewChange: (rect: HmiWidgetRect | null) => void,
) {
	const updateWidget = useHmiStore((s) => s.updateWidget);

	const resizeState = useRef<{
		widgetId: string;
		direction: HmiResizeDirection;
		startMouseX: number;
		startMouseY: number;
		start: { x: number; y: number; width: number; height: number };
		minSize: HmiWidgetSize;
		aspectRatio?: number;
	} | null>(null);

	return (
		e: ReactMouseEvent,
		widget: HmiWidget,
		direction: HmiResizeDirection,
	) => {
		const { minSize = HMI_WIDGET_DEFAULT_MIN_SIZE } =
			HMI_WIDGET_DEFINITIONS[widget.type];
		resizeState.current = {
			widgetId: widget.id,
			direction,
			startMouseX: e.clientX,
			startMouseY: e.clientY,
			start: {
				x: widget.position.x,
				y: widget.position.y,
				width: widget.size.width,
				height: widget.size.height,
			},
			minSize,
			aspectRatio: HmiWidget.getResizeAspectRatio(widget),
		};

		const rectAt = (
			clientX: number,
			clientY: number,
			resize: NonNullable<typeof resizeState.current>,
		) =>
			resizeRect({
				direction: resize.direction,
				start: resize.start,
				dx: (clientX - resize.startMouseX) / zoom,
				dy: (clientY - resize.startMouseY) / zoom,
				minSize: resize.minSize,
				aspectRatio: resize.aspectRatio,
			});

		const onMouseMove = (moveEvent: MouseEvent) => {
			const resize = resizeState.current;
			if (!resize) return;
			onPreviewChange(rectAt(moveEvent.clientX, moveEvent.clientY, resize));
		};
		const onMouseUp = (upEvent: MouseEvent) => {
			const resize = resizeState.current;
			resizeState.current = null;
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
			onPreviewChange(null);
			if (!resize) return;
			const { position, size } = rectAt(
				upEvent.clientX,
				upEvent.clientY,
				resize,
			);
			updateWidget(resize.widgetId, { position, size });
		};
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
	};
}
