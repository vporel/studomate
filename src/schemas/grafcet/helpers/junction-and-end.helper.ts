import Grafcet from "../grafcet.schema";
import Step from "../step.schema";

export default class JunctionAndEndHelper {
	/**
	 * Returns the steps that lead to the junction and end node
	 */
	static getPredecessorSteps(junctionId: string, grafcet: Grafcet): Step[] {
		const connections = grafcet.getConnectionsByElementIdAndHandleType(junctionId, "target");
		const steps: Step[] = [];
		for (const connection of connections) {
			if (connection.source.type === "step") {
				const step = grafcet.getElementByIdAndType<Step>(connection.source.id, "step");
				if (step) steps.push(step);
			} else {
				throw new Error(
					`A junction or end node should only have steps as predecessors. Found a ${connection.source.type}`,
				);
			}
		}
		return steps;
	}
}
