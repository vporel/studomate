import { BinaryExpressionNode } from "@/expression-language/ast/nodes/expressions";
import { OperationSide } from "@/expression-language/operators";
import { ExpectedNodeResultType } from "../type-analyser.visitor";
import SemanticException from "./semantic.exception";

export default class InvalidBinaryExprOperandTypeException extends SemanticException {
	private readonly operator: string;
	private readonly side: OperationSide;
	private readonly expectedType: ExpectedNodeResultType;
	private readonly actualType: ExpectedNodeResultType | "unknown";

	constructor(
		operator: string,
		side: OperationSide,
		expectedType: ExpectedNodeResultType,
		actualType: ExpectedNodeResultType | "unknown",
		originNode: BinaryExpressionNode,
	) {
		super(
			`Invalid operand type for operator '${operator}' on the ${side} side: expected ${expectedType}, got ${actualType}`,
			originNode,
			[side === "left" ? originNode.left : originNode.right],
		);
		this.operator = operator;
		this.side = side;
		this.expectedType = expectedType;
		this.actualType = actualType;
	}

	getOperator(): string {
		return this.operator;
	}

	getSide(): OperationSide {
		return this.side;
	}

	getExpectedType(): ExpectedNodeResultType {
		return this.expectedType;
	}

	getActualType(): ExpectedNodeResultType | "unknown" {
		return this.actualType;
	}
}
