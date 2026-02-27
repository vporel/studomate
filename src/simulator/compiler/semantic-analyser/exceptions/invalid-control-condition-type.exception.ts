import { ControlNode } from "../../ast/nodes/controls";
import SemanticException from "./semantic.exception";

export default class InvalidControlConditionTypeException extends SemanticException {
	constructor(originNode: ControlNode) {
		super(
			`Invalid control condition type: the condition of a control structure must be boolean`,
			originNode,
			[originNode.condition],
		);
	}
}
