import { CounterNode } from "@/expression-language/ast/nodes/blocks";
import { ExpectedNodeResultType } from "../type-analyser.visitor";
import InvalidNodeTypeException from "./invalid-node-type.exception";

export default class InvalidCounterCurrentValueTypeException extends InvalidNodeTypeException {
	constructor(actualType: ExpectedNodeResultType, originNode: CounterNode) {
		super(
			`Invalid counter current value type: the current value (CV) of a counter must be a number`,
			"number",
			actualType,
			originNode,
			[originNode.currentValue],
		);
	}
}
