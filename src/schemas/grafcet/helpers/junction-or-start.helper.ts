import Grafcet from "../grafcet.schema";
import { JUNCTION_HANDLE_PIVOT } from "../junction.schema";
import Step from "../step.schema";
import Transition from "../transition.schema";

export default class JunctionOrStartHelper {
	/**
	 * Returns the transition connected to each branch, in branch display order (left to right).
	 * Returns null for branches that are not connected.
	 */
	static getSuccessorTransitionsByBranchOrder(
		junctionOrStartId: string,
		grafcet: Grafcet,
	): Array<Transition | null> {
		const junctionOrStart = grafcet.junctionsOrStarts.find((j) => j.id === junctionOrStartId);
		if (!junctionOrStart) return [];
		return junctionOrStart.data.branchesOrder.map((branchId) => {
			const conns = grafcet.getConnectionsByElementIdAndHandle(junctionOrStartId, branchId);
			if (conns.length === 0) return null;
			if (conns[0].target.type !== "transition") {
				throw new Error(
					"Branch handles of a junction or start node should be connected to transitions. " +
						`Found a connection to a ${conns[0].target.type} (id: ${conns[0].target.id}).`,
				);
			}
			const transition = grafcet.getElementByIdAndType<Transition>(conns[0].target.id, "transition");
			return transition || null;
		});
	}

	/**
	 * Returns the step that lead to the junction or start node
	 */
	static getPredecessorStep(junctionOrStartId: string, grafcet: Grafcet): Step | null {
		const connectionsToJunctionOrStart = grafcet.getConnectionsByElementIdAndHandle(
			junctionOrStartId,
			JUNCTION_HANDLE_PIVOT,
		);
		if (connectionsToJunctionOrStart.length === 0) return null;
		if (connectionsToJunctionOrStart.length > 1)
			throw new Error(
				"A junction or start node should not have more than one predecessor which should be a step",
			);
		if (connectionsToJunctionOrStart[0].source.type !== "step")
			throw new Error(
				"A junction or start node should have a step as predecessor. Found a " +
					connectionsToJunctionOrStart[0].source.type,
			);

		const step = grafcet.getElementByIdAndType<Step>(connectionsToJunctionOrStart[0].source.id, "step");
		return step || null;
	}
}
