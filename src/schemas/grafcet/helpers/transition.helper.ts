import Connection from "../connection.schema";
import Grafcet from "../grafcet.schema";
import { JUNCTION_HANDLE_PIVOT } from "../junction.schema";
import StepReferralSource from "../step-referral-source.schema";
import Step from "../step.schema";
import {
	TRANSITION_HANDLE_SOURCE_SUCCESSOR,
	TRANSITION_HANDLE_TARGET_PREDECESSOR,
	TransitionHandleSourceSuccessorType,
	TransitionHandleTargetPredecessorType,
} from "../transition.schema";
import JunctionAndEndHelper from "./junction-and-end.helper";
import JunctionAndStartHelper from "./junction-and-start.helper";
import JunctionOrStartHelper from "./junction-or-start.helper";

export default class TransitionHelper {
	/**
	 * Get the steps that are before the transition,
	 * i.e. the steps that have a connection to the transition
	 * It can be through an and junction end
	 */
	static getPredecessorSteps(transitionId: string, grafcet: Grafcet): Step[] {
		const connectionsToTransition = grafcet.getConnectionsByElementIdAndHandle(
			transitionId,
			TRANSITION_HANDLE_TARGET_PREDECESSOR,
		);
		const predecessorSteps: Step[] = [];
		for (const connection of connectionsToTransition) {
			switch (connection.source.type as TransitionHandleTargetPredecessorType) {
				case "step": {
					const step = grafcet.getElementByIdAndType<Step>(
						connection.source.id,
						"step",
					);
					if (step) predecessorSteps.push(step);
					break;
				}
				case "junction-and-end":
					const steps = JunctionAndEndHelper.getPredecessorSteps(
						connection.source.id,
						grafcet,
					);
					predecessorSteps.push(...steps);
					break;
				case "junction-or-start":
					const transition = JunctionOrStartHelper.getPredecessorStep(
						connection.source.id,
						grafcet,
					);
					if (transition) predecessorSteps.push(transition);
					break;
				default:
					throw new Error(
						`A transition should only have steps, junction and ends or junction and starts as predecessors. Found a ${connection.source.type}`,
					);
			}
		}
		return predecessorSteps;
	}

	/**
	 * Returns the steps that will be activated when the transition fires.
	 * Handles direct step connections and AND divergence (junction-and-start → multiple steps).
	 * For step-referral-source, resolves the referenced step by its target number within this grafcet.
	 */
	static getSuccessorSteps(transitionId: string, grafcet: Grafcet): Step[] {
		const connectionsFromTransition =
			grafcet.getConnectionsByElementIdAndHandle(
				transitionId,
				TRANSITION_HANDLE_SOURCE_SUCCESSOR,
			);
		const successorSteps: Step[] = [];
		for (const connection of connectionsFromTransition) {
			switch (connection.target.type as TransitionHandleSourceSuccessorType) {
				case "step": {
					const step = grafcet.getElementByIdAndType<Step>(
						connection.target.id,
						"step",
					);
					if (step) successorSteps.push(step);
					break;
				}
				case "junction-and-start": {
					const steps = JunctionAndStartHelper.getSuccessorSteps(
						connection.target.id,
						grafcet,
					);
					successorSteps.push(...steps);
					break;
				}
				case "step-referral-source": {
					// Resolve the referenced step by its number in the current grafcet
					const referralSource =
						grafcet.getElementByIdAndType<StepReferralSource>(
							connection.target.id,
							"step-referral-source",
						);
					if (referralSource && referralSource.data.targetStepNumber !== "") {
						const step = Object.values(grafcet.steps).find(
							(s) => s.data.number === referralSource.data.targetStepNumber,
						);
						if (step) successorSteps.push(step);
					}
					break;
				}
				case "junction-or-end": {
					// OR convergence: the junction-or-end connects to the next step via its pivot handle
					const pivotConns = grafcet.getConnectionsByElementIdAndHandle(
						connection.target.id,
						JUNCTION_HANDLE_PIVOT,
					);
					for (const pivotConn of pivotConns) {
						if (pivotConn.source.id !== connection.target.id) continue;
						if (pivotConn.target.type === "step") {
							const step = grafcet.getElementByIdAndType<Step>(
								pivotConn.target.id,
								"step",
							);
							if (step) successorSteps.push(step);
						} else if (pivotConn.target.type === "step-referral-source") {
							const referralSource =
								grafcet.getElementByIdAndType<StepReferralSource>(
									pivotConn.target.id,
									"step-referral-source",
								);
							if (
								referralSource &&
								referralSource.data.targetStepNumber !== ""
							) {
								const step = Object.values(grafcet.steps).find(
									(s) => s.data.number === referralSource.data.targetStepNumber,
								);
								if (step) successorSteps.push(step);
							}
						}
					}
					break;
				}
				default:
					throw new Error(
						`Unexpected target type ${connection.target.type} on handle ${TRANSITION_HANDLE_SOURCE_SUCCESSOR} of transition ${transitionId}`,
					);
			}
		}
		return successorSteps;
	}

	/**
	 * Returns all direct predecessor connections of a transition
	 */
	static getPredecessors(transitionId: string, grafcet: Grafcet): Connection[] {
		return grafcet.getConnectionsByElementIdAndHandle(
			transitionId,
			TRANSITION_HANDLE_TARGET_PREDECESSOR,
		);
	}

	/**
	 * Checks if the transition has a predecessor element (no orphan transition)
	 */
	static hasPredecessor(transitionId: string, grafcet: Grafcet): boolean {
		return TransitionHelper.getPredecessors(transitionId, grafcet).length > 0;
	}

	/**
	 * Returns all direct successor connections from a transition
	 */
	static getSuccessors(transitionId: string, grafcet: Grafcet): Connection[] {
		return grafcet.getConnectionsByElementIdAndHandle(
			transitionId,
			TRANSITION_HANDLE_SOURCE_SUCCESSOR,
		);
	}

	/**
	 * Checks if the transition has a successor element (no orphan transition)
	 */
	static hasSuccessor(transitionId: string, grafcet: Grafcet): boolean {
		return TransitionHelper.getSuccessors(transitionId, grafcet).length > 0;
	}
}
