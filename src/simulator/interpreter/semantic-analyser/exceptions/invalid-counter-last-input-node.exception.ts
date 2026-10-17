import { CounterNode } from "@/expression-language/ast/nodes/blocks";
import SemanticException from "./semantic.exception";

export default class InvalidCounterLastInputNodeException extends SemanticException {
	constructor(originNode: CounterNode) {
		super(
			`Invalid counter last input node: the last input of a counter block must be an identifier`,
			originNode,
			[originNode.lastInput],
		);
	}
}
