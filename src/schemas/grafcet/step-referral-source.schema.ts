import { ElementType } from "./element.schema";
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
		};
	}

	readonly type = "step-referral-source";
}
