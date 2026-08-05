import { ComparisonExpressionNode } from "@/expression-language/ast/nodes/expressions";
import { AssignStatementNode } from "@/expression-language/ast/nodes/statements";
import { ExpectedNodeResultType } from "../type-analyser.visitor";
import SemanticException from "./semantic.exception";

export default class IncompatibleOperandsTypesException extends SemanticException {
	private readonly operator: string;
	private readonly leftType: ExpectedNodeResultType;
	private readonly rightType: ExpectedNodeResultType;

	constructor(
		operator: string,
		leftType: ExpectedNodeResultType,
		rightType: ExpectedNodeResultType,
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

	getLeftType(): ExpectedNodeResultType {
		return this.leftType;
	}

	getRightType(): ExpectedNodeResultType {
		return this.rightType;
	}
}
