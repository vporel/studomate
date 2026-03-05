import { ElementType } from "./element.schema";
import { XYPosition } from "./shared-types";
import StepReferral, { StepReferralData } from "./step-referral.schema";

export const STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR = "target:predecessor";

export type StepReferralSourceHandle = typeof STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR;

export const STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR_TYPES = [
	"transition",
	"junction-or-end",
] as const satisfies readonly ElementType[];

export type StepReferralSourceHandleTargetPredecessorType =
	(typeof STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR_TYPES)[number];

export const STEP_REFERRAL_SOURCE_HANDLES_TO_TYPES: Record<StepReferralSourceHandle, readonly ElementType[]> =
	{
		[STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR]:
			STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR_TYPES,
	};

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
