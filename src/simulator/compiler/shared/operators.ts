
export const ASSIGNMENT_OPERATOR = ":=";

export const ARITHMETIC_OPERATORS = ["+", "-", "*", "/"] as const;

export type ArithmeticOperator = (typeof ARITHMETIC_OPERATORS)[number];

export const COMPARISON_OPERATORS = ["=", "!=", "<", ">", "<=", ">="] as const;

export type ComparisonOperator = (typeof COMPARISON_OPERATORS)[number];

export type OperationSide = "left" | "right";