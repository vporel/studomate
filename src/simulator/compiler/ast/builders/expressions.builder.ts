import { ASTNode } from "../nodes/ast-node";
import {
	ArithmeticExpressionNode,
	ArithmeticOperator,
	ComparisonExpressionNode,
	ComparisonOperator,
	LogicalExpressionNode,
	LogicalOperator,
	UnaryExpressionNode,
	UnaryExpressionOperator,
} from "../nodes/expressions";

export default class ExpressionsBuilder {
	static buildUnaryExpressionNode(
		operator: UnaryExpressionOperator,
		expr: ASTNode,
		position: number,
	): UnaryExpressionNode {
		return {
			type: "UNARY_EXPRESSION",
			operator,
			expr,
			position,
		};
	}

	static buildArithmeticExpressionNode(
		operator: ArithmeticOperator,
		left: ASTNode,
		right: ASTNode,
		position: number,
	): ArithmeticExpressionNode {
		return {
			type: "ARITHMETIC_EXPRESSION",
			operator,
			left,
			right,
			position,
		};
	}

	static buildComparisonExpressionNode(
		operator: ComparisonOperator,
		left: ASTNode,
		right: ASTNode,
		position: number,
	): ComparisonExpressionNode {
		return {
			type: "COMPARISON_EXPRESSION",
			operator,
			left,
			right,
			position,
		};
	}

	static buildLogicalExpressionNode(
		operator: LogicalOperator,
		left: ASTNode,
		right: ASTNode,
		position: number,
	): LogicalExpressionNode {
		return {
			type: "LOGICAL_EXPRESSION",
			operator,
			left,
			right,
			position,
		};
	}
}
