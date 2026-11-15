import Action, {
	ACTION_HANDLE_SOURCE_NEXT,
	ACTION_HANDLE_TARGET_PREDECESSOR,
} from "../action.schema";
import Grafcet from "../grafcet.schema";
import Step from "../step.schema";

export default class ActionHelper {
	/**
	 * Returns the element that activates the action directly: a step, or the action chained
	 * before it. Null when the action is linked to nothing.
	 */
	static getPrevious(actionId: string, grafcet: Grafcet): Step | Action | null {
		const connectionsToAction = grafcet.getConnectionsByElementIdAndHandle(
			actionId,
			ACTION_HANDLE_TARGET_PREDECESSOR,
		);
		if (connectionsToAction.length === 0) return null;
		if (connectionsToAction.length > 1) {
			throw new Error(
				`An action should only have one predecessor. Found ${connectionsToAction.length} connections.`,
			);
		}
		const { source } = connectionsToAction[0];
		if (source.type !== "step" && source.type !== "action") {
			throw new Error(
				`An action should only be connected to a step or an action. Found a ${source.type}`,
			);
		}
		return (
			grafcet.getElementByIdAndType<Step | Action>(source.id, source.type) ??
			null
		);
	}

	/** Returns the action chained right after the action, if any. */
	static getNext(actionId: string, grafcet: Grafcet): Action | null {
		const connection = grafcet
			.getConnectionsByElementIdAndHandle(actionId, ACTION_HANDLE_SOURCE_NEXT)
			.find((c) => c.source.id === actionId);
		if (!connection) return null;
		return (
			grafcet.getElementByIdAndType<Action>(connection.target.id, "action") ??
			null
		);
	}

	/**
	 * Returns the actions chained after the action, in chain order. Stops before coming back to an
	 * action already met, so a loop of actions is walked once.
	 */
	static getChainFrom(actionId: string, grafcet: Grafcet): Action[] {
		const chain: Action[] = [];
		const visited = new Set([actionId]);
		let next = ActionHelper.getNext(actionId, grafcet);
		while (next && !visited.has(next.id)) {
			visited.add(next.id);
			chain.push(next);
			next = ActionHelper.getNext(next.id, grafcet);
		}
		return chain;
	}

	/** Whether walking back from the action through the chained actions comes back to it. */
	static isInLoop(actionId: string, grafcet: Grafcet): boolean {
		const visited = new Set([actionId]);
		let previous = ActionHelper.getPrevious(actionId, grafcet);
		while (previous?.type === "action") {
			if (visited.has(previous.id)) return previous.id === actionId;
			visited.add(previous.id);
			previous = ActionHelper.getPrevious(previous.id, grafcet);
		}
		return false;
	}

	/**
	 * Returns the step that activates the action, directly or through the actions chained before
	 * it. Null when the chain is not linked to a step or forms a loop.
	 */
	static getStep(actionId: string, grafcet: Grafcet): Step | null {
		const visited = new Set([actionId]);
		let previous = ActionHelper.getPrevious(actionId, grafcet);
		while (previous?.type === "action") {
			if (visited.has(previous.id)) return null;
			visited.add(previous.id);
			previous = ActionHelper.getPrevious(previous.id, grafcet);
		}
		return previous;
	}
}
