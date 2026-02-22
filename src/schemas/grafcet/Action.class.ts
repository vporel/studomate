import GrafcetElement, { BaseData } from "./GrafcetElement.class";
import { Dimensions, XYPosition } from "./shared-types";

export type ActionData = BaseData & {
	expression: string;
};

export default class Action extends GrafcetElement<ActionData> {
	static DEFAULT_DIMENSIONS: Dimensions = {
		width: 100,
		height: 40,
	};

	static generateDefaultData(): ActionData {
		return {
			expression: "",
			width: Action.DEFAULT_DIMENSIONS.width,
			height: Action.DEFAULT_DIMENSIONS.height,
		};
	}

	constructor(id: string, data: ActionData, position: XYPosition) {
		super(id, "action", data, position);
	}

	validateData(): void {}

	copy(): Action {
		return Action.createFromJSON(JSON.stringify(this));
	}

	static createFromJSON(json: string): Action {
		const jsonParsed = JSON.parse(json);
		return Object.assign(new Action("", { ...Action.generateDefaultData() }, { x: 0, y: 0 }), jsonParsed);
	}
}
