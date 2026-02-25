import { AssignNode } from "../../parser/AST";
import SemanticException from "./semantic.exception";

export default class InvalidAssignmentTargetException extends SemanticException {
	constructor(originNode: AssignNode) {
		super(
			`Invalid assignment target: the left-hand side of an assignment must be an identifier`,
			originNode,
			[originNode.left],
		);
	}
}
