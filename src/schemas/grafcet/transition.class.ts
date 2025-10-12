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

	copy(): Transition {
		return new Transition(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): Transition {
		const jsonParsed = JSON.parse(json);
		return Object.assign(new Transition("", { ...Transition.defaultData }, { x: 0, y: 0 }), jsonParsed);
	}
}
