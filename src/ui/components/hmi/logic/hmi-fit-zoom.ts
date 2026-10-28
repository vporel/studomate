import {
	HMI_CANVAS_HEIGHT,
	HMI_CANVAS_WIDTH,
} from "@/schemas/hmi/hmi-page.schema";
import { clamp } from "@/lib/number";

/** Zoom showing the whole canvas in the space left once the surrounding chrome is removed, never
 * above 100 % and never under `minZoom`. */
export default function getHmiFitZoom({
	availableWidth,
	availableHeight,
	minZoom,
}: {
	availableWidth: number;
	availableHeight: number;
	minZoom: number;
}): number {
	const zoom = Math.min(
		1,
		availableWidth / HMI_CANVAS_WIDTH,
		availableHeight / HMI_CANVAS_HEIGHT,
	);
	return clamp(zoom, minZoom, 1);
}
