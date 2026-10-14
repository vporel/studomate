import { Dialect } from "@/expression-language/dialect.enum";
import { Keyword } from "@/expression-language/keyword.enum";
import { getKeywordString } from "@/expression-language/keywords";
import { isBooleanLiteral } from "@/expression-language/literals/boolean";
import { parseNumberLiteral } from "@/expression-language/literals/number";
import { isStringLiteral } from "@/expression-language/literals/string";
import { parseTimeLiteral } from "@/expression-language/literals/time";
import type Variable from "./variable.schema";
import { getNumericRange, type VariableType } from "./variable.schema";

export type ConstantNativeValue = number | boolean | string;

/** Declared value a new constant of this type starts with. */
export function getDefaultConstantValue(
	type: VariableType,
	dialect: Dialect,
): string {
	switch (type) {
		case "BOOL":
			return getKeywordString(Keyword.FALSE, dialect);
		case "STRING":
			return '""';
		case "TIME":
			return "T#0s";
		default:
			return "0";
	}
}

/**
 * Parses the declared literal of a constant into its native value, or `null` when the text is
 * not a well-formed literal of this type. Integer types must carry an integer inside their
 * range: nothing is coerced.
 */
export function parseConstantLiteral(
	text: string,
	type: VariableType,
	dialect: Dialect,
): ConstantNativeValue | null {
	const trimmed = text.trim();
	switch (type) {
		case "BOOL":
			if (!isBooleanLiteral(trimmed, dialect)) return null;
			return (
				trimmed.toUpperCase() ===
				getKeywordString(Keyword.TRUE, dialect).toUpperCase()
			);
		case "STRING":
			return isStringLiteral(trimmed) ? trimmed.slice(1, -1) : null;
		case "TIME":
			return parseTimeLiteral(trimmed);
		case "REAL":
			return parseNumberLiteral(trimmed);
		default: {
			const value = parseNumberLiteral(trimmed);
			if (value === null || !Number.isInteger(value)) return null;
			const range = getNumericRange(type);
			if (range && (value < range.min || value > range.max)) return null;
			return value;
		}
	}
}

/**
 * Native value of a constant, parsed from its declared literal with the project dialect.
 * `undefined` for a non-constant variable or an invalid literal.
 */
export function getConstantNativeValue(
	variable: Pick<Variable, "zone" | "value" | "type">,
	dialect: Dialect,
): ConstantNativeValue | undefined {
	if (variable.zone !== "constant") return undefined;
	return (
		parseConstantLiteral(variable.value ?? "", variable.type, dialect) ??
		undefined
	);
}
