import { XYPosition } from "./shared-types";
import StepReferral, { StepReferralData } from "./step-referral.schema";

export type StepReferralSourceData = StepReferralData & {
	targetStepNumber: number | "";
};

export default class StepReferralSource extends StepReferral<StepReferralSourceData> {
	static generateDefaultData(): StepReferralSourceData {
		return {
			targetStepNumber: "",
			width: StepReferralSource.DEFAULT_DIMENSIONS.width,
			height: StepReferralSource.DEFAULT_DIMENSIONS.height,
		};
	}

	constructor(id: string, data: StepReferralSourceData, position: XYPosition) {
		super(id, "step-referral-source", data, position);
	}

	copy(): StepReferralSource {
		return new StepReferralSource(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): StepReferralSource {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new StepReferralSource("", { ...StepReferralSource.generateDefaultData() }, { x: 0, y: 0 }),
			jsonParsed,
		);
	}
}
