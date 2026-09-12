import {
	ArithmeticOperator,
	ComparisonOperator,
} from "@/expression-language/operators";

export interface Token {
	type: TokenType;
	value: string;
	position: number; // Position in the input string for error reporting
}

export enum TokenType {
	//Identifiers
	IDENTIFIER = "IDENTIFIER",

	//Literals
	NUMBER = "NUMBER",
	STRING = "STRING",

	//Arithmetic operators
	PLUS = "PLUS", // +
	MINUS = "MINUS", // -
	MUL = "MUL", // *

	//Slash
	SLASH = "SLASH", // Replaces the DIV token to avoid confusion for example in timer expressions (t1/X10/5s)

	//Duration
	DURATION = "DURATION", // 100ms, 2s, etc.

	//Comparison operators
	EQ = "EQ", // =
	NEQ = "NEQ", // <>
	LT = "LT", // <
	GT = "GT", // >
	LTE = "LTE", // <=
	GTE = "GTE", // >=

	//Boolean keywords
	TRUE = "TRUE",
	FALSE = "FALSE",

	//Logical operators
	AND = "AND",
	OR = "OR",
	NOT = "NOT",

	//Parentheses
	LPAREN = "LPAREN",
	RPAREN = "RPAREN",

	//Assignment operator
	ASSIGN = "ASSIGN", // :=

	EOF = "EOF",
}

export const ARITHMETIC_OPERATOR_TOKENS_TYPES: Record<
	ArithmeticOperator,
	TokenType
> = {
	"+": TokenType.PLUS,
	"-": TokenType.MINUS,
	"*": TokenType.MUL,
	"/": TokenType.SLASH,
};

export const COMPARISON_OPERATOR_TOKENS_TYPES: Record<
	ComparisonOperator,
	TokenType
> = {
	"=": TokenType.EQ,
	"!=": TokenType.NEQ,
	"<": TokenType.LT,
	">": TokenType.GT,
	"<=": TokenType.LTE,
	">=": TokenType.GTE,
};
