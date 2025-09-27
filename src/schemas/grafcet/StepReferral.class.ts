import GrafcetElement, { Dimensions } from "./GrafcetElement.class";

export type StepReferralData = {};

export default class StepReferral<DataType> extends GrafcetElement<DataType> {
	static defaultDimensions: Dimensions = {
		width: 40,
		height: 40,
	};
}
