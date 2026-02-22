import GrafcetElement, { BaseData } from "./GrafcetElement.class";
import { Dimensions } from "./shared-types";

export type StepReferralData = BaseData & {};

export default abstract class StepReferral<
	DataType extends StepReferralData,
> extends GrafcetElement<DataType> {
	static DEFAULT_DIMENSIONS: Dimensions = {
		width: 40,
		height: 40,
	};
}
