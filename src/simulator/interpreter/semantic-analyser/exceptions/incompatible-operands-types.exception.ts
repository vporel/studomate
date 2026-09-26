import { ComparisonExpressionNode } from "@/expression-language/ast/nodes/expressions";
import { AssignStatementNode } from "@/expression-language/ast/nodes/statements";
import { ExpectedNodeResultType } from "../type-analyser.visitor";
import BinaryOperandsTypesException from "./binary-operands-types.exception";

export default class IncompatibleOperandsTypesException extends BinaryOperandsTypesException<
	ExpectedNodeResultType,
	ComparisonExpressionNode | AssignStatementNode
> {
	constructor(
		operator: string,
		leftType: ExpectedNodeResultType,
		rightType: ExpectedNodeResultType,
		originNode: ComparisonExpressionNode | AssignStatementNode,
	) {
		super(
			`Incompatible operand types for operator '${operator}': left operand is ${leftType}, right operand is ${rightType}`,
			operator,
			leftType,
			rightType,
			originNode,
		);
	}
}
