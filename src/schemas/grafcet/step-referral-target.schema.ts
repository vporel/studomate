import { GrafcetElementPosition } from "./grafcet-element.schema";
import StepReferral, { StepReferralData } from "./step-referral.schema";

export type StepReferralTargetData = StepReferralData & {
	sourceStepNumber: number | "";
};

export default class StepReferralTarget extends StepReferral {
	static defaultData: StepReferralTargetData = {
		sourceStepNumber: "",
	};

	data: StepReferralTargetData = StepReferralTarget.defaultData;

	constructor(
		id: string,
		data: StepReferralTargetData,
		position: GrafcetElementPosition
	) {
		super(id, position);
		this.data = data;
	}
}
