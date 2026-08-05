import { TimerNode } from "@/expression-language/ast/nodes/blocks";
import { ExpectedNodeResultType } from "../type-analyser.visitor";
import InvalidNodeTypeException from "./invalid-node-type.exception";

export default class InvalidTimerLastInputTypeException extends InvalidNodeTypeException {
	constructor(actualType: ExpectedNodeResultType, originNode: TimerNode) {
		super(
			`Invalid timer last input type: the last input of a timer block must be boolean`,
			"boolean",
			actualType,
			originNode,
			[originNode.input],
		);
	}
}
