import { XYPosition } from "./shared-types";
import StepReferral, { StepReferralData } from "./step-referral.schema";

export type StepReferralTargetData = StepReferralData & {
	sourceStepNumber: number | "";
};

export default class StepReferralTarget extends StepReferral<StepReferralTargetData> {
	static generateDefaultData(): StepReferralTargetData {
		return {
			sourceStepNumber: "",
			width: StepReferralTarget.DEFAULT_DIMENSIONS.width,
			height: StepReferralTarget.DEFAULT_DIMENSIONS.height,
		};
	}

	constructor(id: string, data: StepReferralTargetData, position: XYPosition) {
		super(id, "step-referral-target", data, position);
	}

	copy(): StepReferralTarget {
		return new StepReferralTarget(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): StepReferralTarget {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new StepReferralTarget("", { ...StepReferralTarget.generateDefaultData() }, { x: 0, y: 0 }),
			jsonParsed,
		);
	}
}
