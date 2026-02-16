import { Dimensions } from "./Grafcet.class";
import GrafcetElement from "./GrafcetElement.class";

export type StepData = {
	number: number | "";
	isInitial?: boolean;
};

export default class Step extends GrafcetElement<StepData> {
	static DEFAULT_DIMENSIONS: Dimensions = {
		width: 40,
		height: 40,
	};

	static DEFAULT_DATA: StepData = {
		number: "",
		isInitial: false,
	};

	/**
	 *
	 * @returns null if there is no error
	 */
	validate(): string[] | null {
		return null;
	}

	copy(): Step {
		return new Step(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): Step {
		const jsonParsed = JSON.parse(json);
		return Object.assign(new Step("", { ...Step.DEFAULT_DATA }, { x: 0, y: 0 }), jsonParsed);
	}
}
