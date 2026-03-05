import Grafcet from "../grafcet.schema";
import { JUNCTION_HANDLE_PIVOT } from "../junction.schema";
import Step from "../step.schema";
import Transition from "../transition.schema";

export default class JunctionAndStartHelper {
	/**
	 * Returns the steps that the junction and start fans out to (AND divergence successors).
	 * Each branch handle of the junction connects to one step.
	 */
	static getSuccessorSteps(junctionAndStartId: string, grafcet: Grafcet): Step[] {
		const junctionAndStart = grafcet.junctionsAndStarts.find((j) => j.id === junctionAndStartId);
		if (!junctionAndStart) return [];
		const steps: Step[] = [];
		for (const branchId of junctionAndStart.data.branchesOrder) {
			const conns = grafcet.getConnectionsByElementIdAndHandle(junctionAndStartId, branchId);
			if (conns.length === 0) continue;
			if (conns[0].target.type !== "step") {
				throw new Error(
					"Branch handles of a junction and start node should be connected to steps. " +
						`Found a connection to a ${conns[0].target.type} (id: ${conns[0].target.id}).`,
				);
			}
			const step = grafcet.getElementByIdAndType<Step>(conns[0].target.id, "step");
			if (step) steps.push(step);
		}
		return steps;
	}

	/**
	 * Returns the transition that lead to the junction and start node
	 */
	static getPredecessorTransition(junctionAndStartId: string, grafcet: Grafcet): Transition | null {
		const connectionsToJunctionAndStart = grafcet.getConnectionsByElementIdAndHandle(
			junctionAndStartId,
			JUNCTION_HANDLE_PIVOT,
		);
		if (connectionsToJunctionAndStart.length === 0) return null;
		if (connectionsToJunctionAndStart.length > 1)
			throw new Error(
				"A junction and start node should not have more than one predecessor which should be a transition",
			);
		if (connectionsToJunctionAndStart[0].source.type !== "transition")
			throw new Error(
				"A junction and start node should have a transition as predecessor. Found a " +
					connectionsToJunctionAndStart[0].source.type,
			);

		const transition = grafcet.getElementByIdAndType<Transition>(
			connectionsToJunctionAndStart[0].source.id,
			"transition",
		);
		return transition || null;
	}
}
