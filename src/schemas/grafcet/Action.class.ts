import { Dimensions } from "./Grafcet.class";
import GrafcetElement from "./GrafcetElement.class";

export type ActionData = {
	expression: string;
	width: number;
	height: number;
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

	/**
	 *
	 * @returns null if there is no error
	 */
	validate(): string[] | null {
		/* Expression */

		return null;
	}

	copy(): Action {
		return Action.createFromJSON(JSON.stringify(this));
	}

	static createFromJSON(json: string): Action {
		const jsonParsed = JSON.parse(json);
		return Object.assign(new Action("", { ...Action.generateDefaultData() }, { x: 0, y: 0 }), jsonParsed);
	}
}
