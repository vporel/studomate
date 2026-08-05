import { ASTNode } from "@/expression-language/ast/nodes/ast-node";

export default abstract class SemanticException extends Error {
	private readonly originNode: ASTNode;
	/**
	 * The nodes that caused the semantic error. This can be useful for error reporting, as it allows to highlight the exact nodes that are responsible for the error.
	 */
	private readonly invalidNodes: ASTNode[];

	constructor(message: string, originNode: ASTNode, invalidNodes: ASTNode[]) {
		super(message);
		this.originNode = originNode;
		this.invalidNodes = invalidNodes;
	}

	getOriginNode(): ASTNode {
		return this.originNode;
	}

	getInvalidNodes(): ASTNode[] {
		return this.invalidNodes;
	}
}
