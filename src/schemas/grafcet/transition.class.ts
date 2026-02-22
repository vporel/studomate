import GrafcetElement, { BaseData } from "./GrafcetElement.class";
import { Dimensions, XYPosition } from "./shared-types";

export type TransitionData = BaseData & {
	expression: string;
};

export default class Transition extends GrafcetElement<TransitionData> {
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
