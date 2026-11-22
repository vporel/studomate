import type { ElementConstructor } from "@/schemas/grafcet/element.schema";
import type { DraggedGrafcetElement } from "./GrafcetToolbarDnDContext";

/** Data of an element created from the toolbar; a comment starts with `commentText`. */
export default function newElementData(
	element: DraggedGrafcetElement,
	elementClass: ElementConstructor<any>,
	commentText: string,
): unknown {
	if (element.type === "comment")
		return { ...elementClass.generateDefaultData(), text: commentText };
	return elementClass.generateDefaultData(
		element.type === "step" ? element.extraData : undefined,
	);
}
