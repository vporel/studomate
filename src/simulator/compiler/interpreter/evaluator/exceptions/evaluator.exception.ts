import { ASTNode } from "@/simulator/compiler/ast/nodes/ast-node";

export default class EvaluatorException extends Error {
	private originNode: ASTNode;

	constructor(message: string, originNode: ASTNode) {
		super(message);
		this.originNode = originNode;
	}

	public getOriginNode(): ASTNode {
		return this.originNode;
	}
}
