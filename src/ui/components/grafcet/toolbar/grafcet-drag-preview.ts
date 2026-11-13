import { elementOps } from "@/ui/pdf/drawing/grafcet-scene";
import { sceneToSvg } from "@/ui/lib/drawing/backends/svg-backend";
import { GRAFCET_ELEMENT_CLASSES } from "@/ui/utils/grafcet/grafcet-element-classes";
import { DraggedGrafcetElement } from "./GrafcetToolbarDnDContext";

/** Room, in px, left around the element so that its strokes on the edges are not cut. */
const PREVIEW_MARGIN = 2;

/**
 * Markup of the drawing shown under the cursor while an element is dragged from the toolbar: the
 * element as it will look once dropped (drawn like in the PDF export), at the zoom of the flow.
 */
export function buildGrafcetDragPreview(
	element: DraggedGrafcetElement,
	zoom: number,
): { markup: string; width: number; height: number } {
	const elementClass = GRAFCET_ELEMENT_CLASSES[element.type];
	const size = { ...elementClass.DEFAULT_DIMENSIONS };
	const drawn = new elementClass(
		"drag-preview",
		elementClass.generateDefaultData(
			element.type === "step" ? element.extraData : undefined,
		),
		{ x: PREVIEW_MARGIN, y: PREVIEW_MARGIN },
		size,
	);
	const scene = {
		ops: elementOps(drawn),
		width: size.width + 2 * PREVIEW_MARGIN,
		height: size.height + 2 * PREVIEW_MARGIN,
	};
	return {
		width: scene.width * zoom,
		height: scene.height * zoom,
		markup: sceneToSvg(scene, { scale: zoom, background: false }),
	};
}

/**
 * Replaces the browser's drag image by the element being created, centered on the cursor like the
 * element is when it is dropped.
 */
export default function setGrafcetDragPreview(
	dataTransfer: DataTransfer,
	element: DraggedGrafcetElement,
	zoom: number,
): void {
	const { markup, width, height } = buildGrafcetDragPreview(element, zoom);
	const preview = document.createElement("div");
	Object.assign(preview.style, {
		position: "fixed",
		top: "-1000px",
		left: "-1000px",
		width: `${width}px`,
		height: `${height}px`,
		pointerEvents: "none",
	});
	preview.innerHTML = markup;
	document.body.appendChild(preview);
	dataTransfer.setDragImage(preview, width / 2, height / 2);
	//The browser snapshots the element synchronously, so it can be removed right after.
	setTimeout(() => preview.remove(), 0);
}
