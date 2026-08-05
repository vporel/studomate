import { AssignStatementNode } from "@/expression-language/ast/nodes/statements";
import SemanticException from "./semantic.exception";

export default class InvalidAssignmentTargetException extends SemanticException {
	constructor(originNode: AssignStatementNode) {
		super(
			`Invalid assignment target: the left-hand side of an assignment must be an identifier`,
			originNode,
			[originNode.left],
		);
	}
}
