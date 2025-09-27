import { Dimensions } from "./Grafcet.class";
import GrafcetElement from "./GrafcetElement.class";

export type TransitionData = {
	expression: string;
};

export default class Transition extends GrafcetElement<TransitionData> {
	static defaultDimensions: Dimensions = {
		width: 40,
		height: 30,
	};

	static defaultData: TransitionData = {
		expression: "",
	};

	/**
	 *
	 * @returns null if there is no error
	 */
	validate(): string[] | null {
		/*
            Expression
        */

		return null;
	}
}
