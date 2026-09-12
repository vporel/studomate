import { ACTION_HANDLE_TARGET_STEP } from "../action.schema";
import Grafcet from "../grafcet.schema";
import Step from "../step.schema";

export default class ActionHelper {
	/**
	 * Returns the step that is connected to the action, if any
	 */
	static getStep(actionId: string, grafcet: Grafcet): Step | null {
		const connectionsToAction = grafcet.getConnectionsByElementIdAndHandle(
			actionId,
			ACTION_HANDLE_TARGET_STEP,
		);
		if (connectionsToAction.length === 0) return null;
		if (connectionsToAction.length > 1) {
			throw new Error(
				`An action should only be connected to one step. Found ${connectionsToAction.length} connections.`,
			);
		}
		const connection = connectionsToAction[0];
		if (connection.source.type !== "step") {
			throw new Error(
				`An action should only be connected to a step. Found a ${connection.source.type}`,
			);
		}
		const step = grafcet.getElementByIdAndType<Step>(
			connection.source.id,
			"step",
		);
		return step || null;
	}
}
