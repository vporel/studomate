import {
	ArithmeticExpressionNode,
	ComparisonExpressionNode,
} from "@/expression-language/ast/nodes/expressions";
import { NumericType } from "../numeric-typing";
import SemanticException from "./semantic.exception";

export default class IncompatibleNumericTypesException extends SemanticException {
	private readonly operator: string;
	private readonly leftType: NumericType;
	private readonly rightType: NumericType;

	constructor(
		operator: string,
		leftType: NumericType,
		rightType: NumericType,
		originNode: ArithmeticExpressionNode | ComparisonExpressionNode,
	) {
		super(
			`Operator '${operator}' cannot combine ${leftType} and ${rightType} without an explicit conversion`,
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

	getLeftType(): NumericType {
		return this.leftType;
	}

	getRightType(): NumericType {
		return this.rightType;
	}
}
