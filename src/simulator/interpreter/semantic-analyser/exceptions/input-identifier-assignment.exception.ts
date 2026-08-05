import { AssignStatementNode } from "@/expression-language/ast/nodes/statements";
import SemanticException from "./semantic.exception";

export default class InputIdentifierAssignmentException extends SemanticException {
	constructor(originNode: AssignStatementNode) {
		super(`Invalid assignment: cannot assign a value to an input identifier`, originNode, [
			originNode.left,
		]);
	}
}
