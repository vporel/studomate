import {
	ArithmeticOperator,
	ComparisonOperator,
} from "@/expression-language/operators";
import { ConvertibleType } from "@/expression-language/conversions";
import { ASTNode } from "./ast-node";
import { BaseNode } from "./base-node";

export type UnaryExpressionOperator = "NOT" | "-";

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

export type BinaryExpressionNode =
	ArithmeticExpressionNode | ComparisonExpressionNode | LogicalExpressionNode;

/**
 * `<sourceType>_TO_<targetType>(expr)`. `sourceType` is `null` when the conversion takes the
 * operand's own type (Ladder conversion block, whose source is the type of its `IN` variable).
 */
export interface ConversionExpressionNode extends BaseNode {
	type: "CONVERSION_EXPRESSION";
	sourceType: ConvertibleType | null;
	targetType: ConvertibleType;
	expr: ASTNode;
}

export type ExpressionNode =
	| UnaryExpressionNode
	| BinaryExpressionNode
	| ConversionExpressionNode;
