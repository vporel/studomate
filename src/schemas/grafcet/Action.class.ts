import { Dimensions } from "./Grafcet.class";
import GrafcetElement from "./GrafcetElement.class";

export type ActionData = {
	expression: string;
	width: number;
	height: number;
};

export default class Action extends GrafcetElement<ActionData> {
	static defaultDimensions: Dimensions = {
		width: 100,
		height: 40,
	};

	static defaultData: ActionData = {
		expression: "",
		width: Action.defaultDimensions.width,
		height: Action.defaultDimensions.height,
	};

	/**
	 *
	 * @returns null if there is no error
	 */
	validate(): string[] | null {
		/* Expression */

		return null;
	}
}
