import GrafcetElement, { Dimensions } from "./GrafcetElement.class";

export type StepData = {
	number: number | "";
	isInitial?: boolean;
};

export default class Step extends GrafcetElement<StepData> {
	static defaultDimensions: Dimensions = {
		width: 40,
		height: 40,
	};

	static defaultData: StepData = {
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
}
