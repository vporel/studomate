import StepReferral, { StepReferralData } from "./StepReferral.class";

export type StepReferralSourceData = StepReferralData & {
	targetStepNumber: number | "";
};

export default class StepReferralSource extends StepReferral<StepReferralSourceData> {
	static defaultData: StepReferralSourceData = {
		targetStepNumber: "",
	};
}
