import StepReferral, { StepReferralData } from "./StepReferral.class";

export type StepReferralTargetData = StepReferralData & {
	sourceStepNumber: number | "";
};

export default class StepReferralTarget extends StepReferral<StepReferralTargetData> {
	static defaultData: StepReferralTargetData = {
		sourceStepNumber: "",
	};

	copy(): StepReferralTarget {
		return new StepReferralTarget(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): StepReferralTarget {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new StepReferralTarget("", { ...StepReferralTarget.defaultData }, { x: 0, y: 0 }),
			jsonParsed
		);
	}
}
