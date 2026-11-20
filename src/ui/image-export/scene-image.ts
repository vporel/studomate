import { Scene } from "@/ui/lib/drawing/draw-op";
import { sceneToSvg } from "@/ui/lib/drawing/backends/svg-backend";

/** Resolution of a PNG relative to the scene's px size. */
export const PNG_SCALE = 2;
/** Largest canvas side and area browsers reliably accept (Safari caps the area near 16.7 M px). */
const MAX_CANVAS_SIDE = 8192;
const MAX_CANVAS_AREA = 16_000_000;

/** Largest scale not above `desired` that keeps the canvas within browser limits. */
export function fitRasterScale(
	width: number,
	height: number,
	desired: number = PNG_SCALE,
): number {
	if (width <= 0 || height <= 0) return desired;
	return Math.min(
		desired,
		MAX_CANVAS_SIDE / Math.max(width, height),
		Math.sqrt(MAX_CANVAS_AREA / (width * height)),
	);
}

/** Standalone SVG document of the scene, on a white background. */
export function sceneToSvgString(scene: Scene): string {
	return sceneToSvg(scene);
}

function loadImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Scene image failed to load"));
		image.src = url;
	});
}

/** PNG bytes of the scene, rasterized from its SVG on a white background. */
export async function sceneToPngBytes(scene: Scene): Promise<Uint8Array> {
	const scale = fitRasterScale(scene.width, scene.height);
	const width = Math.max(1, Math.round(scene.width * scale));
	const height = Math.max(1, Math.round(scene.height * scale));

	const svgBlob = new Blob([sceneToSvg(scene, { scale })], {
		type: "image/svg+xml;charset=utf-8",
	});
	const url = URL.createObjectURL(svgBlob);
	try {
		const image = await loadImage(url);
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas 2D context unavailable");
		context.drawImage(image, 0, 0, width, height);
		const png = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, "image/png"),
		);
		if (!png) throw new Error("PNG encoding failed");
		return new Uint8Array(await png.arrayBuffer());
	} finally {
		URL.revokeObjectURL(url);
	}
}
