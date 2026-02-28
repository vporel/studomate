import { TimerNode } from "../../ast/nodes/blocks";
import SemanticException from "./semantic.exception";

export default class InvalidTimerLastInputNodeException extends SemanticException {
	constructor(originNode: TimerNode) {
		super(
			`Invalid timer last input node: the last input of a timer block must be an identifier`,
			originNode,
			[originNode.lastInput],
		);
	}
}
