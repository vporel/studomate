import GrafcetElement, {
	GrafcetElementDimensions,
} from "./grafcet-element.schema";

export type StepReferralData = {};

export default class StepReferral extends GrafcetElement {
	static defaultDimensions: GrafcetElementDimensions = {
		width: 40,
		height: 40,
	};
}
