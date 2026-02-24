import { ArithmeticOperator, ComparisonOperator } from "../lexer/tokens/TokenType.enum";

export type IdentifierNode = { type: "IDENTIFIER"; value: string; position: number };
export type BooleanNode = { type: "BOOLEAN"; value: boolean; position: number };
export type NumberNode = { type: "NUMBER"; value: number; position: number };
export type StringNode = { type: "STRING"; value: string; position: number };
export type NotNode = { type: "NOT"; expr: ASTNode; position: number };
export type AndNode = { type: "AND"; left: ASTNode; right: ASTNode; position: number };
export type OrNode = { type: "OR"; left: ASTNode; right: ASTNode; position: number };
export type CompareNode = {
	type: "COMPARE";
	operator: ComparisonOperator;
	left: ASTNode;
	right: ASTNode;
	position: number;
};
export type ArithmeticNode = {
	type: "ARITHMETIC";
	operator: ArithmeticOperator;
	left: ASTNode;
	right: ASTNode;
	position: number;
};
export type AssignNode = { type: "ASSIGN"; left: ASTNode; right: ASTNode; position: number };

export type BinaryOperatorNode = AndNode | OrNode | CompareNode | ArithmeticNode;

export type ASTNode =
	| IdentifierNode
	| BooleanNode
	| NumberNode
	| StringNode
	| NotNode
	| AndNode
	| OrNode
	| CompareNode
	| ArithmeticNode
	| AssignNode;
