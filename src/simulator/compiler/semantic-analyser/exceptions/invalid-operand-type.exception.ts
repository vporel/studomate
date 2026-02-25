import { BinaryOperatorNode } from "../../parser/AST";
import { OperationSide, PossibleNodeResultType } from "../types";
import SemanticException from "./semantic.exception";

export default class InvalidOperandTypeException extends SemanticException {
	private readonly operator: string;
	private readonly side: OperationSide;
	private readonly expectedType: PossibleNodeResultType;
	private readonly actualType: PossibleNodeResultType;

	constructor(
		operator: string,
		side: OperationSide,
		expectedType: PossibleNodeResultType,
		actualType: PossibleNodeResultType,
		originNode: BinaryOperatorNode,
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

	getExpectedType(): PossibleNodeResultType {
		return this.expectedType;
	}

	getActualType(): PossibleNodeResultType {
		return this.actualType;
	}
}
