import Grafcet from "../grafcet.schema";
import { JUNCTION_HANDLE_PIVOT } from "../junction.schema";
import Step from "../step.schema";

export default class JunctionOrStartHelper {
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
