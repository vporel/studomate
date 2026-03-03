import Grafcet from "../grafcet.schema";
import StepReferralSource from "../step-referral-source.schema";
import { STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR } from "../step-referral-target.schema";

export default class StepReferralTargetHelper {
	/**
	 * Returns the step that is after the step referral target
	 * Returns null if no sourceStepNumber is defined in the step referral target
	 * Returns null if no step found
	 */
	static getTargetStep(stepReferralTargetId: string, grafcet: Grafcet) {
		const stepReferralTarget = grafcet.getElementByIdAndType(
			stepReferralTargetId,
			"step-referral-target",
		);
		if (!stepReferralTarget) return null;
		if (stepReferralTarget.data.sourceStepNumber === "") return null;
		const connections = grafcet.getConnectionsByElementIdAndHandle(
			stepReferralTargetId,
			STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR,
		);
		if (connections.length === 0) return null;
		if (connections.length > 1)
			throw new Error(
				`A step referral target should not have more than one successor, but ${connections.length} were found.`,
			);
		const connection = connections[0];
		if (connection.target.type !== "step")
			throw new Error(
				`The successor of a step referral target should be a step, but a ${connection.target.type} was found.`,
			);
		const targetStep = grafcet.getElementByIdAndType(connection.target.id, "step");
		return targetStep || null;
	}

	/**
	 * Returns the step referral source related to the step referral target, if it exists
	 * Returns null if no sourceStepNumber is defined
	 * Returns null if the step referral source doesn't exist
	 */
	static getStepReferralSource(stepReferralTargetId: string, grafcet: Grafcet): StepReferralSource | null {
		const stepReferralTarget = grafcet.getElementByIdAndType(
			stepReferralTargetId,
			"step-referral-target",
		);
		if (!stepReferralTarget) return null;
		if (stepReferralTarget.data.sourceStepNumber === "") return null;
		const targetStep = this.getTargetStep(stepReferralTargetId, grafcet);
		if (!targetStep) return null;
		const allStepReferralSources = grafcet.getElementsByType<StepReferralSource>("step-referral-source");
		const stepReferralSource = allStepReferralSources.find(
			(source) => source.data.targetStepNumber === targetStep.data.number,
		);
		return stepReferralSource || null;
	}
}
