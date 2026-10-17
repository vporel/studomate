import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import SemanticException from "./semantic.exception";

/** Two operands of a binary node whose types cannot be combined. */
export default abstract class BinaryOperandsTypesException<
	TType,
	TNode extends ASTNode & { left: ASTNode; right: ASTNode },
> extends SemanticException {
	private readonly operator: string;
	private readonly leftType: TType;
	private readonly rightType: TType;

	constructor(
		message: string,
		operator: string,
		leftType: TType,
		rightType: TType,
		originNode: TNode,
	) {
		super(message, originNode, [originNode.left, originNode.right]);
		this.operator = operator;
		this.leftType = leftType;
		this.rightType = rightType;
	}

	getOperator(): string {
		return this.operator;
	}

	getLeftType(): TType {
		return this.leftType;
	}

	getRightType(): TType {
		return this.rightType;
	}
}
