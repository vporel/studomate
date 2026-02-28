import Grafcet from "../grafcet.schema";
import { JUNCTION_HANDLE_PIVOT } from "../junction.schema";
import Transition from "../transition.schema";

export default class JunctionAndStartHelper {
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
