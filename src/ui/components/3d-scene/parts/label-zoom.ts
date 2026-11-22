/**
 * Scale of a label seen by a perspective camera: 1 when the label is at the distance where
 * `distanceFactor` world units span the camera's vertical field of view, growing as the camera
 * comes closer.
 */
export default function labelZoom(
	distance: number,
	fovDegrees: number,
	distanceFactor: number,
): number {
	const viewHeightAtDistance =
		2 * Math.tan((fovDegrees * Math.PI) / 360) * distance;
	return viewHeightAtDistance > 0 ? distanceFactor / viewHeightAtDistance : 1;
}
