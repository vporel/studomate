import { TimerNode } from "@/expression-language/ast/nodes/blocks";
import { ExpectedNodeResultType } from "../type-analyser.visitor";
import InvalidNodeTypeException from "./invalid-node-type.exception";

export default class InvalidTimerElapsedTimeTypeException extends InvalidNodeTypeException {
	constructor(actualType: ExpectedNodeResultType, originNode: TimerNode) {
		super(
			`Invalid timer elapsed time type: the elapsed time of a timer block must be a number (found ${actualType}).`,
			"number",
			actualType,
			originNode,
			[originNode.elapsedTime],
		);
	}
}
