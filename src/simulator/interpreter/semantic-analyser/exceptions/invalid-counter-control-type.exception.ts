import { CounterNode } from "@/expression-language/ast/nodes/blocks";
import { ExpectedNodeResultType } from "../type-analyser.visitor";
import InvalidNodeTypeException from "./invalid-node-type.exception";

export default class InvalidCounterControlTypeException extends InvalidNodeTypeException {
	constructor(actualType: ExpectedNodeResultType, originNode: CounterNode) {
		super(
			`Invalid counter control type: the control (R/LD) of a counter must be boolean`,
			"boolean",
			actualType,
			originNode,
			[originNode.control],
		);
	}
}
