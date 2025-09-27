import StepReferral, { StepReferralData } from "./StepReferral.class";

export type StepReferralTargetData = StepReferralData & {
	sourceStepNumber: number | "";
};

export default class StepReferralTarget extends StepReferral<StepReferralTargetData> {
	static defaultData: StepReferralTargetData = {
		sourceStepNumber: "",
	};
}
