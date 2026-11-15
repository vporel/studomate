import type { Vector3 } from "three";

/**
 * Narrowest width/height ratio at which the scenes are framed by their camera. A narrower view
 * moves the camera back so that it still sees the same width of the scene.
 */
export const SCENE_REFERENCE_ASPECT = 4 / 3;

/**
 * How far the camera must be from its target, relative to its framing distance, for a view of
 * `aspect` width/height to show the width a view of `referenceAspect` shows. A perspective camera
 * keeps its vertical field of view, so the width it sees is proportional to the aspect.
 */
export function widthFitDistanceFactor(
	aspect: number,
	referenceAspect = SCENE_REFERENCE_ASPECT,
): number {
	if (!(aspect > 0)) return 1;
	return aspect >= referenceAspect ? 1 : referenceAspect / aspect;
}

/** Moves `position` along its line to `target`, multiplying its distance to it by `ratio`. */
export function scaleDistanceToTarget(
	position: Vector3,
	target: Vector3,
	ratio: number,
): void {
	position.sub(target).multiplyScalar(ratio).add(target);
}
