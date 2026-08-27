import { CounterNode } from "@/expression-language/ast/nodes/blocks";
import SemanticException from "./semantic.exception";

export default class InvalidCounterOutputNodeException extends SemanticException {
	constructor(originNode: CounterNode) {
		super(
			`Invalid counter output node: the output of a counter block must be an identifier`,
			originNode,
			[originNode.output],
		);
	}
}
