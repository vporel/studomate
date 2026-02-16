import { Dimensions } from "./Grafcet.class";
import GrafcetElement from "./GrafcetElement.class";

export type StepReferralData = {};

export default abstract class StepReferral<DataType> extends GrafcetElement<DataType> {
	static DEFAULT_DIMENSIONS: Dimensions = {
		width: 40,
		height: 40,
	};
}
