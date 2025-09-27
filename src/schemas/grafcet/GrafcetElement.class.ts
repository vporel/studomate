import { XYPosition } from "@xyflow/react";

export type GrafcetElementType =
	| "step"
	| "transition"
	| "action"
	| "step-referral-source"
	| "step-referral-target"
	| "junction-and-start"
	| "junction-and-end"
	| "junction-or-start"
	| "junction-or-end"
	| "comment";

export default class GrafcetElement<DataType> {
	id: string = "";
	data: DataType;
	position: XYPosition = { x: 0, y: 0 };

	constructor(id: string, data: DataType, position: XYPosition) {
		this.id = id;
		this.data = data;
		this.position = position;
	}
}
