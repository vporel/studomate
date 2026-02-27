import { PossibleNodeResultType } from "../../ast/nodes/ast-node";
import { ComparisonExpressionNode } from "../../ast/nodes/expressions";
import { AssignStatementNode } from "../../ast/nodes/statements";
import SemanticException from "./semantic.exception";

export default class IncompatibleOperandsTypesException extends SemanticException {
	private readonly operator: string;
	private readonly leftType: PossibleNodeResultType;
	private readonly rightType: PossibleNodeResultType;

	constructor(
		operator: string,
		leftType: PossibleNodeResultType,
		rightType: PossibleNodeResultType,
		originNode: ComparisonExpressionNode | AssignStatementNode,
	) {
		super(
			`Incompatible operand types for operator '${operator}': left operand is ${leftType}, right operand is ${rightType}`,
			originNode,
			[originNode.left, originNode.right],
		);
		this.operator = operator;
		this.leftType = leftType;
		this.rightType = rightType;
	}

	getOperator(): string {
		return this.operator;
	}

	getLeftType(): PossibleNodeResultType {
		return this.leftType;
	}

	getRightType(): PossibleNodeResultType {
		return this.rightType;
	}
}
