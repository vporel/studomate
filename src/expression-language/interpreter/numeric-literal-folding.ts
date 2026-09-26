import { ArithmeticOperator } from "../operators";
import { NumberLiteralKind } from "../ast/nodes/literals";

export type FoldedNumber = { value: number; kind: NumberLiteralKind };

/**
 * Result of an operation between two constants, with the standard's semantics: between two
 * integers, division truncates toward zero and the result stays an integer; a real operand makes
 * the result real. `null` when a `TIME` constant is involved (not folded) or on a division by
 * zero, which the caller reports itself.
 */
export function foldNumberLiterals(
	operator: ArithmeticOperator,
	left: FoldedNumber,
	right: FoldedNumber,
): FoldedNumber | null {
	if (left.kind === "time" || right.kind === "time") return null;
	const kind: NumberLiteralKind =
		left.kind === "real" || right.kind === "real" ? "real" : "integer";
	switch (operator) {
		case "+":
			return { value: left.value + right.value, kind };
		case "-":
			return { value: left.value - right.value, kind };
		case "*":
			return { value: left.value * right.value, kind };
		case "/": {
			if (right.value === 0) return null;
			const quotient = left.value / right.value;
			return { value: kind === "integer" ? Math.trunc(quotient) : quotient, kind };
		}
	}
}
