import { XYPosition } from "@xyflow/react";

//Export a constant of list of all the element types. This is used to avoid typos and have a single source of truth for the element types.
export const GRAFCET_ELEMENT_TYPES = [
	"step",
	"transition",
	"action",
	"step-referral-source",
	"step-referral-target",
	"junction-and-start",
	"junction-and-end",
	"junction-or-start",
	"junction-or-end",
	"comment",
] as const;

export type GrafcetElementType = (typeof GRAFCET_ELEMENT_TYPES)[number];

export default abstract class GrafcetElement<DataType> {
	id: string = "";
	data: DataType;
	position: XYPosition = { x: 0, y: 0 };

	constructor(id: string, data: DataType, position: XYPosition) {
		this.id = id;
		this.data = data;
		this.position = position;
	}

	abstract copy(): GrafcetElement<DataType>;
}
