import Element, { ElementType } from "./element.schema";
import { Dimensions } from "./shared-types";

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
	"junction-or-end",
] as const satisfies readonly ElementType[];

export type TransitionHandleSourceSuccessorType =
	(typeof TRANSITION_HANDLE_SOURCE_SUCCESSOR_TYPES)[number];

export const TRANSITION_HANDLES_TO_TYPES: Record<
	TransitionHandle,
	readonly ElementType[]
> = {
	[TRANSITION_HANDLE_TARGET_PREDECESSOR]:
		TRANSITION_HANDLE_TARGET_PREDECESSOR_TYPES,
	[TRANSITION_HANDLE_SOURCE_SUCCESSOR]:
		TRANSITION_HANDLE_SOURCE_SUCCESSOR_TYPES,
};

export type TransitionData = {
	expression: string;
};

export default class Transition extends Element<TransitionData> {
	readonly type = "transition";

	static DEFAULT_DIMENSIONS: Dimensions = {
		width: 40,
		height: 30,
	};

	static generateDefaultData(): TransitionData {
		return {
			expression: "",
		};
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
}
