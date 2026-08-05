import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import SemanticException from "./semantic.exception";

export default class UnauthorizedNodeException extends SemanticException {
	private readonly nodeType: ASTNode["type"];

	constructor(nodeType: ASTNode["type"], originNode: ASTNode) {
		super(`Unauthorized node of type: ${nodeType}`, originNode, [originNode]);
		this.nodeType = nodeType;
	}

	getNodeType(): ASTNode["type"] {
		return this.nodeType;
	}
}
