import {
	HMI_CANVAS_HEIGHT,
	HMI_CANVAS_WIDTH,
} from "@/schemas/hmi/hmi-page.schema";

type PositionedWidget = {
	position: { x: number; y: number };
	size: { width: number; height: number };
};

/** Borne un déplacement de groupe `(dx, dy)` pour qu'aucun widget du groupe ne sorte du canvas —
 * même contrainte que le glisser (`useHmiWidgetDrag`), appliquée sur la boîte englobante du
 * groupe. Groupe vide → aucun déplacement. */
export default function clampGroupDelta(
	widgets: PositionedWidget[],
	dx: number,
	dy: number,
): { dx: number; dy: number } {
	if (widgets.length === 0) return { dx: 0, dy: 0 };
	const minX = Math.min(...widgets.map((w) => w.position.x));
	const minY = Math.min(...widgets.map((w) => w.position.y));
	const maxX = Math.max(...widgets.map((w) => w.position.x + w.size.width));
	const maxY = Math.max(...widgets.map((w) => w.position.y + w.size.height));
	return {
		dx: Math.max(-minX, Math.min(HMI_CANVAS_WIDTH - maxX, dx)),
		dy: Math.max(-minY, Math.min(HMI_CANVAS_HEIGHT - maxY, dy)),
	};
}
