import { ElementType } from "./element.schema";
import StepReferral, { StepReferralData } from "./step-referral.schema";

export const STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR = "source:successor";

export const STEP_REFERRAL_TARGET_HANDLES = {
	"source:successor": "source:successor",
} as const;

export type StepReferralTargetHandle = typeof STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR;

export const STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR_TYPES = [
	"step",
] as const satisfies readonly ElementType[];

export const STEP_REFERRAL_TARGET_HANDLES_TO_TYPES: Record<StepReferralTargetHandle, readonly ElementType[]> =
	{
		[STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR]: STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR_TYPES,
	};

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

	readonly type = "step-referral-target";
}
