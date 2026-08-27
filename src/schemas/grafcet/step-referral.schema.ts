import Element from "./element.schema";
import { Dimensions } from "./shared-types";

export default abstract class StepReferral<DataType> extends Element<DataType> {
	static DEFAULT_DIMENSIONS: Dimensions = {
		width: 40,
		height: 40,
	};
}
