import Element, { BaseData, ElementType } from "./element.schema";
import { Dimensions, XYPosition } from "./shared-types";

export const STEP_HANDLE_TARGET_PREDECESSOR = "target:predecessor";
export const STEP_HANDLE_SOURCE_SUCCESSOR = "source:successor";
export const STEP_HANDLE_SOURCE_ACTION = "source:action";

export type StepHandle =
	| typeof STEP_HANDLE_TARGET_PREDECESSOR
	| typeof STEP_HANDLE_SOURCE_SUCCESSOR
	| typeof STEP_HANDLE_SOURCE_ACTION;

export const STEP_HANDLE_TARGET_PREDECESSOR_TYPES = [
	"transition",
	"step-referral-target",
	"junction-and-start",
	"junction-or-end",
] as const satisfies readonly ElementType[];

export type StepHandleTargetPredecessorType = (typeof STEP_HANDLE_TARGET_PREDECESSOR_TYPES)[number];

export const STEP_HANDLE_SOURCE_SUCCESSOR_TYPES = [
	"transition",
	"step-referral-source",
	"junction-and-end",
	"junction-or-start",
] as const satisfies readonly ElementType[];

export type StepHandleSourceSuccessorType = (typeof STEP_HANDLE_SOURCE_SUCCESSOR_TYPES)[number];

export const STEP_HANDLE_SOURCE_ACTION_TYPES = ["action"] as const satisfies readonly ElementType[];

export type StepHandleSourceActionType = (typeof STEP_HANDLE_SOURCE_ACTION_TYPES)[number];

export const STEP_HANDLES_TO_TYPES: Record<StepHandle, readonly ElementType[]> = {
	[STEP_HANDLE_TARGET_PREDECESSOR]: STEP_HANDLE_TARGET_PREDECESSOR_TYPES,
	[STEP_HANDLE_SOURCE_SUCCESSOR]: STEP_HANDLE_SOURCE_SUCCESSOR_TYPES,
	[STEP_HANDLE_SOURCE_ACTION]: STEP_HANDLE_SOURCE_ACTION_TYPES,
};

export type StepData = BaseData & {
	number: number | "";
	initial?: boolean;
};

export default class Step extends Element<StepData> {
	static DEFAULT_DIMENSIONS: Dimensions = {
		width: 40,
		height: 40,
	};

	static generateDefaultData(extraData?: { initial?: boolean }): StepData {
		return {
			number: "",
			initial: extraData?.initial ?? false,
			width: Step.DEFAULT_DIMENSIONS.width,
			height: Step.DEFAULT_DIMENSIONS.height,
		};
	}

	constructor(id: string, data: StepData, position: XYPosition) {
		super(id, "step", data, position);
	}

	copy(): Step {
		return new Step(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): Step {
		const jsonParsed = JSON.parse(json);
		return Object.assign(new Step("", { ...Step.generateDefaultData() }, { x: 0, y: 0 }), jsonParsed);
	}
}
