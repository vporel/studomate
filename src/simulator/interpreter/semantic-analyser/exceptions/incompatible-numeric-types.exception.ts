import {
	ArithmeticExpressionNode,
	ComparisonExpressionNode,
} from "@/expression-language/ast/nodes/expressions";
import { NumericType } from "../numeric-typing";
import BinaryOperandsTypesException from "./binary-operands-types.exception";

export default class IncompatibleNumericTypesException extends BinaryOperandsTypesException<
	NumericType,
	ArithmeticExpressionNode | ComparisonExpressionNode
> {
	constructor(
		operator: string,
		leftType: NumericType,
		rightType: NumericType,
		originNode: ArithmeticExpressionNode | ComparisonExpressionNode,
	) {
		super(
			`Operator '${operator}' cannot combine ${leftType} and ${rightType} without an explicit conversion`,
			operator,
			leftType,
			rightType,
			originNode,
		);
	}
}
