import Grafcet from "../grafcet.schema";
import StepReferralSource, {
	StepReferralSourceHandleTargetPredecessorType,
} from "../step-referral-source.schema";
import Step, { STEP_HANDLE_TARGET_PREDECESSOR } from "../step.schema";
import Transition from "../transition.schema";

export default class StepReferralSourceHelper {
	/**
	 * Returns the step referral with the target step number, if it exists
	 * If not, returns null
	 */
	static getStepReferralSourceByTargetStepNumber(
		targetStepNumber: number,
		grafcet: Grafcet,
	): StepReferralSource | null {
		const stepReferralSources = grafcet.getElementsByType<StepReferralSource>("step-referral-source");
		const stepReferralSource = stepReferralSources.find(
			(source) => source.data.targetStepNumber === targetStepNumber,
		);
		return stepReferralSource || null;
	}

	/**
	 * Returns the transitions that lead to the step referral source node
	 * The transition can be connected with a direct connection
	 * or through an or junction end
	 */
	static getPredecessorTransitions(stepReferralSourceId: string, grafcet: Grafcet): Transition[] {
		const connectionsToStepReferralSource = grafcet.getConnectionsByElementIdAndHandle(
			stepReferralSourceId,
			STEP_HANDLE_TARGET_PREDECESSOR,
		);
		const predecessorTransitions: Transition[] = [];
		for (const connection of connectionsToStepReferralSource) {
			switch (connection.source.type as StepReferralSourceHandleTargetPredecessorType) {
				case "transition":
					const transition = grafcet.getElementByIdAndType<Transition>(
						connection.source.id,
						"transition",
					);
					if (transition) predecessorTransitions.push(transition);
					break;
				case "junction-or-end":
					const junctionIncomingConnections = grafcet.getConnectionsByElementIdAndHandleType(
						connection.source.id,
						"target",
					);
					for (const junctionConnection of junctionIncomingConnections) {
						if (junctionConnection.source.type === "transition") {
							const transition = grafcet.getElementByIdAndType<Transition>(
								junctionConnection.source.id,
								"transition",
							);
							if (transition) predecessorTransitions.push(transition);
						}
					}
					break;
			}
		}
		return predecessorTransitions;
	}

	/**
	 * Checks if the step referral source has a predecessor (no orphan step referral source)
	 */
	static hasPredecessor(stepReferralSourceId: string, grafcet: Grafcet): boolean {
		const connectionsToStepReferralSource = grafcet.getConnectionsByElementIdAndHandle(
			stepReferralSourceId,
			STEP_HANDLE_TARGET_PREDECESSOR,
		);
		return connectionsToStepReferralSource.length > 0;
	}

	/**
	 * Returns the step that is before the step referral source, if it exists
	 * The step should be linked to the step referral source through a transition
	 * Returns null if for example a junction is between the transition and the step referral source,
	 * because in this case we can't determine which step is before the step referral source
	 */
	static getDirectUniquePredecessorStep(stepReferralSourceId: string, grafcet: Grafcet): Step | null {
		const connectionsToStepReferralSource = grafcet.getConnectionsByElementIdAndHandle(
			stepReferralSourceId,
			STEP_HANDLE_TARGET_PREDECESSOR,
		);
		if (connectionsToStepReferralSource.length !== 1) return null;
		const connectionToStepReferralSource = connectionsToStepReferralSource[0];
		const predecessorTransition = grafcet.getElementByIdAndType<Transition>(
			connectionToStepReferralSource.source.id,
			"transition",
		);
		if (!predecessorTransition) return null;
		const connectionsToTransition = grafcet.getConnectionsByElementIdAndHandle(
			predecessorTransition.id,
			STEP_HANDLE_TARGET_PREDECESSOR,
		);
		if (connectionsToTransition.length !== 1) return null;
		const connectionToTransition = connectionsToTransition[0];
		if (connectionToTransition.source.type !== "step") return null;
		const predecessorStep = grafcet.getElementByIdAndType<Step>(connectionToTransition.source.id, "step");
		return predecessorStep || null;
	}
}
