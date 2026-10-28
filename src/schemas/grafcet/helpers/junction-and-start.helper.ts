import Grafcet from "../grafcet.schema";
import Step from "../step.schema";

export default class JunctionAndStartHelper {
	/**
	 * Returns the steps that the junction and start fans out to (AND divergence successors).
	 * Each branch handle of the junction connects to one step.
	 */
	static getSuccessorSteps(
		junctionAndStartId: string,
		grafcet: Grafcet,
	): Step[] {
		const junctionAndStart = grafcet.junctionsAndStarts[junctionAndStartId];
		if (!junctionAndStart) return [];
		const steps: Step[] = [];
		for (const branchId of junctionAndStart.data.branchesOrder) {
			const conns = grafcet.getConnectionsByElementIdAndHandle(
				junctionAndStartId,
				branchId,
			);
			if (conns.length === 0) continue;
			if (conns[0].target.type !== "step") {
				throw new Error(
					"Branch handles of a junction and start node should be connected to steps. " +
						`Found a connection to a ${conns[0].target.type} (id: ${conns[0].target.id}).`,
				);
			}
			const step = grafcet.getElementByIdAndType<Step>(
				conns[0].target.id,
				"step",
			);
			if (step) steps.push(step);
		}
		return steps;
	}
}
