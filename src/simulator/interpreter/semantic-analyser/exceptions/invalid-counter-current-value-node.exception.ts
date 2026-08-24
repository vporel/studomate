import { CounterNode } from "@/expression-language/ast/nodes/blocks";
import SemanticException from "./semantic.exception";

export default class InvalidCounterCurrentValueNodeException extends SemanticException {
	constructor(originNode: CounterNode) {
		super(`Invalid counter current value node: the current value (CV) of a counter must be an identifier`, originNode, [
			originNode.currentValue,
		]);
	}
}
