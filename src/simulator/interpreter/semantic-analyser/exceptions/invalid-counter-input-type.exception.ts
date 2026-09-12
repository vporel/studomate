import { CounterNode } from "@/expression-language/ast/nodes/blocks";
import { ExpectedNodeResultType } from "../type-analyser.visitor";
import InvalidNodeTypeException from "./invalid-node-type.exception";

export default class InvalidCounterInputTypeException extends InvalidNodeTypeException {
	constructor(actualType: ExpectedNodeResultType, originNode: CounterNode) {
		super(
			`Invalid counter input type: the input of a counter must be boolean`,
			"boolean",
			actualType,
			originNode,
			[originNode.input],
		);
	}
}
