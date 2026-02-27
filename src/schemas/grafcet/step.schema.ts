import Element, { BaseData } from "./element.schema";
import { Dimensions, XYPosition } from "./shared-types";

export const GRAFCET_STEP_HANDLES = {
	fromTransition: "from-transition",
	toTransition: "to-transition",
	toAction: "to-action",
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
