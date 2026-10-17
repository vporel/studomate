import { AssignStatementNode } from "@/expression-language/ast/nodes/statements";
import SemanticException from "./semantic.exception";

export default class AssignmentToConstantException extends SemanticException {
	constructor(originNode: AssignStatementNode) {
		super(
			`Invalid assignment: "${originNode.left.type === "IDENTIFIER" ? originNode.left.value : ""}" is a constant`,
			originNode,
			[originNode.left],
		);
	}
}
