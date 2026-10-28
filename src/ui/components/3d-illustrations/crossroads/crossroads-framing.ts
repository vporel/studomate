export const CAMERA_FOV = 40;
export const CAMERA_TARGET: [number, number, number] = [0, 0.2, 0];
const RAW_DIRECTION: [number, number, number] = [4.6, 4.4, 5.4];
/** Unit vector from the target towards the camera. */
export const CAMERA_DIRECTION = RAW_DIRECTION.map(
	(c) => c / Math.hypot(...RAW_DIRECTION),
) as [number, number, number];
/** Height on screen of the base with its traffic lights, in world units at the target. */
const FRAMED_HEIGHT = 6.5;
/** Share of the canvas the base takes up along its limiting dimension. */
export const FILL = 0.78;

/** Distance from the target at which a square base of side `baseSize` fits a `width`×`height` canvas. */
export function cameraDistance(
	baseSize: number,
	width: number,
	height: number,
): number {
	const [x, , z] = CAMERA_DIRECTION;
	const framedWidth =
		(baseSize * (Math.abs(x) + Math.abs(z))) / Math.hypot(x, z);
	const halfHeight = Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);
	const aspect = width / Math.max(height, 1);
	return (
		Math.max(
			FRAMED_HEIGHT / 2 / halfHeight,
			framedWidth / 2 / (halfHeight * aspect),
		) / FILL
	);
}
