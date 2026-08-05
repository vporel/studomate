import { ArithmeticOperator, ComparisonOperator } from "@/simulator/compiler/shared/operators";
import { ASTNode } from "./ast-node";
import { BaseNode } from "./base-node";

export type UnaryExpressionOperator = "NOT";

export interface UnaryExpressionNode extends BaseNode {
	type: "UNARY_EXPRESSION";
	operator: UnaryExpressionOperator;
	expr: ASTNode;
}

export interface ArithmeticExpressionNode extends BaseNode {
	type: "ARITHMETIC_EXPRESSION";
	operator: ArithmeticOperator;
	left: ASTNode;
	right: ASTNode;
}

export interface ComparisonExpressionNode extends BaseNode {
	type: "COMPARISON_EXPRESSION";
	operator: ComparisonOperator;
	left: ASTNode;
	right: ASTNode;
}

export type LogicalOperator = "AND" | "OR";

export interface LogicalExpressionNode extends BaseNode {
	type: "LOGICAL_EXPRESSION";
	operator: LogicalOperator;
	left: ASTNode;
	right: ASTNode;
}

export type BinaryExpressionNode = ArithmeticExpressionNode | ComparisonExpressionNode | LogicalExpressionNode;

export type ExpressionNode =
	| UnaryExpressionNode
	| BinaryExpressionNode
