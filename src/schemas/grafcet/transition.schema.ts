import Element, { BaseData, ElementType } from "./element.schema";
import { Dimensions, XYPosition } from "./shared-types";

export const TRANSITION_HANDLE_TARGET_PREDECESSOR = "target:predecessor";
export const TRANSITION_HANDLE_SOURCE_SUCCESSOR = "source:successor";

export type TransitionHandle =
	| typeof TRANSITION_HANDLE_TARGET_PREDECESSOR
	| typeof TRANSITION_HANDLE_SOURCE_SUCCESSOR;

export const TRANSITION_HANDLE_TARGET_PREDECESSOR_TYPES = [
	"step",
	"junction-and-end",
	"junction-or-start",
] as const satisfies readonly ElementType[];

export type TransitionHandleTargetPredecessorType =
	(typeof TRANSITION_HANDLE_TARGET_PREDECESSOR_TYPES)[number];

export const TRANSITION_HANDLE_SOURCE_SUCCESSOR_TYPES = [
	"step",
	"step-referral-source",
	"junction-and-start",
] as const satisfies readonly ElementType[];

export type TransitionHandleSourceSuccessorType = (typeof TRANSITION_HANDLE_SOURCE_SUCCESSOR_TYPES)[number];

export const TRANSITION_HANDLES_TO_TYPES: Record<TransitionHandle, readonly ElementType[]> = {
	[TRANSITION_HANDLE_TARGET_PREDECESSOR]: TRANSITION_HANDLE_TARGET_PREDECESSOR_TYPES,
	[TRANSITION_HANDLE_SOURCE_SUCCESSOR]: TRANSITION_HANDLE_SOURCE_SUCCESSOR_TYPES,
};

export type TransitionData = BaseData & {
	expression: string;
};

export default class Transition extends Element<TransitionData> {
	static DEFAULT_DIMENSIONS: Dimensions = {
		width: 40,
		height: 30,
	};

	static generateDefaultData(): TransitionData {
		return {
			expression: "",
			width: Transition.DEFAULT_DIMENSIONS.width,
			height: Transition.DEFAULT_DIMENSIONS.height,
		};
	}

	constructor(id: string, data: TransitionData, position: XYPosition) {
		super(id, "transition", data, position);
	}

	/**
	 * All the lines in the expression are joined to form one line
	 */
	getFullExpression(): string {
		return this.data.expression.split("\n").join(" ");
	}

	validate(): string[] {
		return [];
	}

	copy(): Transition {
		return new Transition(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): Transition {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new Transition("", { ...Transition.generateDefaultData() }, { x: 0, y: 0 }),
			jsonParsed,
		);
	}
}
