import { CounterNode } from "@/expression-language/ast/nodes/blocks";
import { ExpectedNodeResultType } from "../type-analyser.visitor";
import InvalidNodeTypeException from "./invalid-node-type.exception";

export default class InvalidCounterOutputTypeException extends InvalidNodeTypeException {
	constructor(actualType: ExpectedNodeResultType, originNode: CounterNode) {
		super(
			`Invalid counter output type: the output of a counter block must be boolean`,
			"boolean",
			actualType,
			originNode,
			[originNode.output],
		);
	}
}
