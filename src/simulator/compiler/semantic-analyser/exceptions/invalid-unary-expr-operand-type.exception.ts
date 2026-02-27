import { PossibleNodeResultType } from "../../ast/nodes/ast-node";
import { UnaryExpressionNode } from "../../ast/nodes/expressions";
import SemanticException from "./semantic.exception";

export default class InvalidUnaryExprOperandTypeException extends SemanticException {
	private readonly operator: string;
	private readonly expectedType: PossibleNodeResultType;
	private readonly actualType: PossibleNodeResultType;

	constructor(
		operator: string,
		expectedType: PossibleNodeResultType,
		actualType: PossibleNodeResultType,
		originNode: UnaryExpressionNode,
	) {
		super(
			`Invalid operand type for operator '${operator}' : expected ${expectedType}, got ${actualType}`,
			originNode,
			[originNode.expr]
		);
		this.operator = operator;
		this.expectedType = expectedType;
		this.actualType = actualType;
	}

	getOperator(): string {
		return this.operator;
	}

	getExpectedType(): PossibleNodeResultType {
		return this.expectedType;
	}

	getActualType(): PossibleNodeResultType {
		return this.actualType;
	}
}
