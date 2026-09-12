import { TimerNode } from "@/expression-language/ast/nodes/blocks";
import SemanticException from "./semantic.exception";

export default class InvalidTimerOutputNodeException extends SemanticException {
	constructor(originNode: TimerNode) {
		super(
			`Invalid timer output node: the output of a timer block must be an identifier`,
			originNode,
			[originNode.output],
		);
	}
}
