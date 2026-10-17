import { BaseNode } from "./base-node";

export interface BooleanNode extends BaseNode {
	type: "BOOLEAN_LITERAL";
	value: boolean;
}

/** `time`: a `T#...` constant, value in milliseconds. */
export type NumberLiteralKind = "integer" | "real" | "time";

export interface NumberNode extends BaseNode {
	type: "NUMBER_LITERAL";
	value: number;
	/** Inferred from the value when absent (see `getNumberLiteralKind`). `real` for a literal
	 * written with a decimal part, even a whole one (`2.0`). */
	kind?: NumberLiteralKind;
}

export interface StringNode extends BaseNode {
	type: "STRING_LITERAL";
	value: string;
}

export type LiteralNode = BooleanNode | NumberNode | StringNode;

export function getNumberLiteralKind(node: NumberNode): NumberLiteralKind {
	return node.kind ?? (Number.isInteger(node.value) ? "integer" : "real");
}
