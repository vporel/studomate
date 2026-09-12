import { TimerNode } from "@/expression-language/ast/nodes/blocks";
import SemanticException from "./semantic.exception";

export default class InvalidTimerElapsedTimeNodeException extends SemanticException {
	constructor(originNode: TimerNode) {
		super(
			`Invalid timer elapsed time node: the elapsed time of a timer block must be an identifier`,
			originNode,
			[originNode.elapsedTime],
		);
	}
}
