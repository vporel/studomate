import { UnaryExpressionNode } from "@/expression-language/ast/nodes/expressions";
import { ExpectedNodeResultType } from "../type-analyser.visitor";
import SemanticException from "./semantic.exception";

export default class InvalidUnaryExprOperandTypeException extends SemanticException {
	private readonly operator: string;
	private readonly expectedType: ExpectedNodeResultType;
	private readonly actualType: ExpectedNodeResultType | "unknown";

	constructor(
		operator: string,
		expectedType: ExpectedNodeResultType,
		actualType: ExpectedNodeResultType | "unknown",
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

	getActualType(): ExpectedNodeResultType | "unknown" {
		return this.actualType;
	}
}
