import { TimerNode } from "../../ast/nodes/blocks";
import { ExpectedNodeResultType } from "../type-analyser.visitor";
import InvalidNodeTypeException from "./invalid-node-type.exception";

export default class InvalidTimerOutputTypeException extends InvalidNodeTypeException {
	constructor(actualType: ExpectedNodeResultType, originNode: TimerNode) {
		super(
			`Invalid timer output type: the output of a timer block must be boolean`,
			"boolean",
			actualType,
			originNode,
			[originNode.output],
		);
	}
}
