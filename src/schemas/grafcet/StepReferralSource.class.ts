import StepReferral, { StepReferralData } from "./StepReferral.class";

export type StepReferralSourceData = StepReferralData & {
	targetStepNumber: number | "";
};

export default class StepReferralSource extends StepReferral<StepReferralSourceData> {
	static defaultData: StepReferralSourceData = {
		targetStepNumber: "",
	};

	copy(): StepReferralSource {
		return new StepReferralSource(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): StepReferralSource {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new StepReferralSource("", { ...StepReferralSource.defaultData }, { x: 0, y: 0 }),
			jsonParsed
		);
	}
}
