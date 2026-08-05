import { TimerNode, TimerStringDeclarationNode } from "@/expression-language/ast/nodes/blocks";
import { ExpectedNodeResultType } from "../type-analyser.visitor";
import InvalidNodeTypeException from "./invalid-node-type.exception";

export default class InvalidTimerInputTypeException extends InvalidNodeTypeException {
	constructor(actualType: ExpectedNodeResultType, originNode: TimerNode | TimerStringDeclarationNode) {
		super(
			`Invalid timer input type: the input of a timer must be boolean`,
			"boolean",
			actualType,
			originNode,
			[originNode.input],
		);
	}
}
