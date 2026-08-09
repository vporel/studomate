import Grafcet from "../grafcet.schema";
import Step, {
	STEP_HANDLE_SOURCE_ACTION,
	STEP_HANDLE_SOURCE_SUCCESSOR,
	STEP_HANDLE_TARGET_PREDECESSOR,
	StepHandleTargetPredecessorType,
} from "../step.schema";
import Transition from "../transition.schema";
import JunctionAndStartHelper from "./junction-and-start.helper";
import JunctionOrEndHelper from "./junction-or-end.helper";
import StepReferralSourceHelper from "./step-referral-source.helper";
import StepReferralTargetHelper from "./step-referral-target.helper";
import TransitionHelper from "./transition.helper";

export default class StepHelper {
	/**
	 * Mnémonique de la variable synthétique X{n} associée à une étape numérotée n.
	 */
	static getStepVariableMnemonic(stepNumber: number): string {
		return `X${stepNumber}`;
	}

	/**
	 * Get the next available number for a step in the grafcet
	 * It will return the number after the max number used by the steps in the grafcet
	 * @param grafcet
	 * @returns
	 */
	static getNextAvailableNumber(grafcet: Grafcet): number {
		const steps = grafcet.getElementsByType<Step>("step");
		if (steps.length === 0) return 0;
		const numbers = steps
			.map((s) => s.data.number)
			.filter((n) => n !== "" && !isNaN(parseInt(n + "")))
			.map((n) => parseInt(n + ""));
		const maxNumber = Math.max(...numbers, 0);
		return maxNumber + 1;
	}

	/**
	 * Returns all the branches (transitionId + steps before the transition) that can activate the step.
	 * @param step
	 * @param grafcet
	 */
	static getPredecessorBranches(
		stepId: string,
		grafcet: Grafcet,
	): { transition: Transition; stepsBeforeTransition: Step[] }[] {
		const incomingConnections = grafcet.getConnectionsByElementIdAndHandle(
			stepId,
			STEP_HANDLE_TARGET_PREDECESSOR,
		);
		const transitions: Transition[] = [];
		for (const connection of incomingConnections) {
			//We check on the types that can be connection on this handle
			switch (connection.source.type as StepHandleTargetPredecessorType) {
				case "transition":
					const transition = grafcet.getElementByIdAndType<Transition>(
						connection.source.id,
						"transition",
					)!;
					if (transition) transitions.push(transition);
					break;
				case "step-referral-target":
					const stepReferralSource = StepReferralTargetHelper.getStepReferralSource(
						connection.source.id,
						grafcet,
					);
					if (stepReferralSource) {
						const transitions_ = StepReferralSourceHelper.getPredecessorTransitions(
							stepReferralSource.id,
							grafcet,
						);
						transitions.push(...transitions_);
					}
					break;
				case "junction-and-start":
					const transition_ = JunctionAndStartHelper.getPredecessorTransition(
						connection.source.id,
						grafcet,
					);
					if (transition_) transitions.push(transition_);
					break;
				case "junction-or-end":
					const transitions_ = JunctionOrEndHelper.getPredecessorTransitions(
						connection.source.id,
						grafcet,
					);
					transitions.push(...transitions_);
					break;
				default:
					throw new Error(
						`Unexpected source type ${connection.source.type} on handle ${STEP_HANDLE_TARGET_PREDECESSOR} of step ${stepId}`,
					);
			}
		}
		return transitions.map((transition) => {
			const stepsBeforeTransition = TransitionHelper.getPredecessorSteps(transition.id, grafcet);
			return { transition, stepsBeforeTransition };
		});
	}

	/**
	 * Checks if the step has a predecessor element (no orphan step)
	 */
	static hasPredecessor(stepId: string, grafcet: Grafcet): boolean {
		const connectionsToStep = grafcet.getConnectionsByElementIdAndHandle(
			stepId,
			STEP_HANDLE_TARGET_PREDECESSOR,
		);
		return connectionsToStep.length > 0;
	}

	/**
	 * Checks if the step has a successor element (no orphan step)
	 */
	static hasSuccessor(stepId: string, grafcet: Grafcet): boolean {
		const connectionsFromStep = grafcet.getConnectionsByElementIdAndHandle(
			stepId,
			STEP_HANDLE_SOURCE_SUCCESSOR,
		);
		return connectionsFromStep.length > 0;
	}

	/**
	 * Returns the actions that are activated by the step
	 */
	static getActions(stepId: string, grafcet: Grafcet) {
		const connectionsFromStep = grafcet.getConnectionsByElementIdAndHandle(
			stepId,
			STEP_HANDLE_SOURCE_ACTION,
		);
		const actions = [];
		for (const connection of connectionsFromStep) {
			if (connection.target.type !== "action") {
				throw new Error(
					`Unexpected target type ${connection.target.type} on handle ${STEP_HANDLE_SOURCE_ACTION} of step ${stepId}`,
				);
			}
			const action = grafcet.getElementByIdAndType(connection.target.id, "action");
			if (action) actions.push(action);
		}
		return actions;
	}
}
