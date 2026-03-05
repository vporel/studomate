import { ExpectedNodeResultType } from "../../ast/nodes/ast-node";
import { UnaryExpressionNode } from "../../ast/nodes/expressions";
import SemanticException from "./semantic.exception";

export default class InvalidUnaryExprOperandTypeException extends SemanticException {
	private readonly operator: string;
	private readonly expectedType: ExpectedNodeResultType;
	private readonly actualType: ExpectedNodeResultType;

	constructor(
		operator: string,
		expectedType: ExpectedNodeResultType,
		actualType: ExpectedNodeResultType,
		originNode: UnaryExpressionNode,
	) {
		super(
			`Invalid operand type for operator '${operator}' : expected ${expectedType}, got ${actualType}`,
			originNode,
			[originNode.expr],
		);
		this.operator = operator;
		this.expectedType = expectedType;
		this.actualType = actualType;
	}

	getOperator(): string {
		return this.operator;
	}

	getExpectedType(): ExpectedNodeResultType {
		return this.expectedType;
	}

	getActualType(): ExpectedNodeResultType {
		return this.actualType;
	}
}
