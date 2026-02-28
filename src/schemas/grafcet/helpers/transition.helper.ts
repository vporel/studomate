import Grafcet from "../grafcet.schema";
import Step from "../step.schema";
import {
	TRANSITION_HANDLE_SOURCE_SUCCESSOR,
	TRANSITION_HANDLE_TARGET_PREDECESSOR,
	TransitionHandleTargetPredecessorType,
} from "../transition.schema";
import JunctionAndEndHelper from "./junction-and-end.helper";
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
				case "step":
					const step = grafcet.getElementByIdAndType(connection.source.id, "step");
					if (step) predecessorSteps.push(step);
					break;
				case "junction-and-end":
					const steps = JunctionAndEndHelper.getPredecessorSteps(connection.source.id, grafcet);
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
	 * Checks if the transition has a predecessor element (no orphan transition)
	 */
	static hasPredecessor(transitionId: string, grafcet: Grafcet): boolean {
		const connectionsToTransition = grafcet.getConnectionsByElementIdAndHandle(
			transitionId,
			TRANSITION_HANDLE_TARGET_PREDECESSOR,
		);
		return connectionsToTransition.length > 0;
	}

	/**
	 * Checks if the transition has a successor element (no orphan transition)
	 */
	static hasSuccessor(transitionId: string, grafcet: Grafcet): boolean {
		const connectionsFromTransition = grafcet.getConnectionsByElementIdAndHandle(
			transitionId,
			TRANSITION_HANDLE_SOURCE_SUCCESSOR,
		);
		return connectionsFromTransition.length > 0;
	}
}
