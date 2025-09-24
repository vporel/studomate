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

export type GrafcetElementPosition = { x: number; y: number };
export type GrafcetElementDimensions = { width: number; height: number };

export default class GrafcetElement {
	id: string = "";
	position: GrafcetElementPosition = { x: 0, y: 0 };

	constructor(id: string, position: GrafcetElementPosition) {
		this.id = id;
		this.position = position;
	}
}
