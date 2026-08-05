import { ASTNode } from "@/simulator/compiler/ast/nodes/ast-node";
import { ExpectedNodeResultType } from "../type-analyser.visitor";
import SemanticException from "./semantic.exception";

export default abstract class InvalidNodeTypeException extends SemanticException {
	private readonly expectedType: ExpectedNodeResultType;
	private readonly actualType: ExpectedNodeResultType;

	constructor(
		message: string,
		expectedType: ExpectedNodeResultType,
		actualType: ExpectedNodeResultType,
		originNode: ASTNode,
		invalidNodes: ASTNode[],
	) {
		super(message, originNode, invalidNodes);
		this.expectedType = expectedType;
		this.actualType = actualType;
	}

	getExpectedType(): ExpectedNodeResultType {
		return this.expectedType;
	}

	getActualType(): ExpectedNodeResultType {
		return this.actualType;
	}
}
