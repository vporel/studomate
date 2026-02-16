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

	static DEFAULT_DATA: ActionData = {
		expression: "",
		width: Action.DEFAULT_DIMENSIONS.width,
		height: Action.DEFAULT_DIMENSIONS.height,
	};

	/**
	 *
	 * @returns null if there is no error
	 */
	validate(): string[] | null {
		/* Expression */

		return null;
	}

	copy(): Action {
		return new Action(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): Action {
		const jsonParsed = JSON.parse(json);
		return Object.assign(new Action("", { ...Action.DEFAULT_DATA }, { x: 0, y: 0 }), jsonParsed);
	}
}
