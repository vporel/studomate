import Grafcet from "../grafcet.schema";
import Transition from "../transition.schema";

export default class JunctionOrEndHelper {
	/**
	 * Returns the transitions that lead to the junction or end node
	 */
	static getPredecessorTransitions(junctionOrEndId: string, grafcet: Grafcet): Transition[] {
		const connectionsToJunctionOrEnd = grafcet.getConnectionsByElementIdAndHandleType(
			junctionOrEndId,
			"target",
		);
		const transitions: Transition[] = [];
		for (const connection of connectionsToJunctionOrEnd) {
			if (connection.source.type === "transition") {
				const transition = grafcet.getElementByIdAndType<Transition>(
					connection.source.id,
					"transition",
				);
				if (transition) transitions.push(transition);
			} else {
				throw new Error(
					`A junction or end node should only have transitions as predecessors. Found a ${connection.source.type}`,
				);
			}
		}
		return transitions;
	}
}
