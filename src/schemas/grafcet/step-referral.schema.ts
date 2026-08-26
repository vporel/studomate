import Element from "./element.schema";
import { Dimensions } from "./shared-types";

export type StepReferralData = Record<string, never>;

export default abstract class StepReferral<DataType extends StepReferralData> extends Element<DataType> {
	static DEFAULT_DIMENSIONS: Dimensions = {
		width: 40,
		height: 40,
	};
}
