import { Dimensions, XYPosition } from "@/schemas/grafcet/shared-types";

/** Anything placed on the grafcet page: an element, or an element about to be placed. */
export type Box = { position: XYPosition; size: Dimensions };

/** Horizontal center of the box, at its own position or at `position`. */
export const centerX = (box: Box, position: XYPosition = box.position) =>
	position.x + box.size.width / 2;

/** Vertical center of the box, at its own position or at `position`. */
export const centerY = (box: Box, position: XYPosition = box.position) =>
	position.y + box.size.height / 2;

export const right = (box: Box) => box.position.x + box.size.width;

export const bottom = (box: Box) => box.position.y + box.size.height;
