import { ArithmeticOperator } from "@/expression-language/operators";
import { NumericRange } from "@/lib/numeric-range";
import {
	getNumericRange,
	VariableType,
} from "@/schemas/variable/variable.schema";

/**
 * Types of a numeric expression under the IEC 61131-3 rules.
 * - `ANY_INT` / `ANY_REAL`: an untyped constant, which takes the type imposed by its context.
 * - `ANY_NUM`: a variable without declared type (internal variable), exempt from the rules.
 */
export type ConcreteNumericType = "INT" | "DINT" | "WORD" | "DWORD" | "REAL" | "TIME";
export type NumericType = ConcreteNumericType | "ANY_INT" | "ANY_REAL" | "ANY_NUM";

/** `value` is known when the expression is a constant (literal, or operation between literals). */
export type TypedNumber = { type: NumericType; value?: number };

const CONCRETE_NUMERIC_TYPES: readonly VariableType[] = [
	"INT",
	"DINT",
	"WORD",
	"DWORD",
	"REAL",
	"TIME",
];

export function numericTypeOfDeclaredType(
	declaredType: VariableType | null,
): NumericType {
	return declaredType && CONCRETE_NUMERIC_TYPES.includes(declaredType)
		? (declaredType as ConcreteNumericType)
		: "ANY_NUM";
}

export function isBitStringType(type: NumericType): boolean {
	return type === "WORD" || type === "DWORD";
}

export function isIntegerType(type: NumericType): boolean {
	return (
		type === "INT" ||
		type === "DINT" ||
		type === "WORD" ||
		type === "DWORD" ||
		type === "ANY_INT"
	);
}

function isConstantType(type: NumericType): boolean {
	return type === "ANY_INT" || type === "ANY_REAL";
}

/** Value domain enforced on a result of this type (`null`: no bound). */
export function getNumericTypeRange(type: NumericType): NumericRange | null {
	switch (type) {
		case "INT":
		case "DINT":
		case "WORD":
		case "DWORD":
			return getNumericRange(type);
		default:
			return null;
	}
}

/** Implicit conversions allowed by the standard (widening without loss), restricted to the
 * types Studomate offers. `DINT → REAL` is not one of them (possible loss of precision). */
function widensTo(from: NumericType, to: NumericType): boolean {
	if (from === to) return true;
	return (
		(from === "INT" && (to === "DINT" || to === "REAL")) ||
		(from === "WORD" && to === "DWORD")
	);
}

/** `true` if the constant can take the type `target` (kind and, when known, value range). */
export function constantFits(constant: TypedNumber, target: NumericType): boolean {
	if (constant.type === "ANY_REAL") return target === "REAL";
	if (constant.type !== "ANY_INT") return false;
	if (target === "REAL") return true;
	const range = getNumericTypeRange(target);
	if (!range) return false;
	return (
		constant.value === undefined ||
		(constant.value >= range.min && constant.value <= range.max)
	);
}

/** `true` if the constant has the right kind for `target` but a value outside its range. */
export function isConstantOutOfRange(
	constant: TypedNumber,
	target: NumericType,
): boolean {
	return (
		constant.type === "ANY_INT" &&
		getNumericTypeRange(target) !== null &&
		!constantFits(constant, target)
	);
}

/** Common type of two operands, or `null` if no implicit conversion reconciles them. */
export function unifyNumericTypes(
	left: TypedNumber,
	right: TypedNumber,
): NumericType | null {
	if (left.type === "ANY_NUM" || right.type === "ANY_NUM") return "ANY_NUM";
	if (left.type === right.type) return left.type;
	if (isConstantType(left.type) && isConstantType(right.type)) return "ANY_REAL";
	if (isConstantType(left.type))
		return constantFits(left, right.type) ? right.type : null;
	if (isConstantType(right.type))
		return constantFits(right, left.type) ? left.type : null;
	if (widensTo(left.type, right.type)) return right.type;
	if (widensTo(right.type, left.type)) return left.type;
	return null;
}

/**
 * Result type of `left <operator> right`, or `null` if the operation is not allowed. On `TIME`:
 * `TIME ± TIME`, `TIME * n` and `TIME / n` only. Arithmetic on a bit string (`WORD`, `DWORD`) is
 * rejected by the caller before this function is reached.
 */
export function arithmeticResultType(
	operator: ArithmeticOperator,
	left: TypedNumber,
	right: TypedNumber,
): NumericType | null {
	if (left.type === "ANY_NUM" || right.type === "ANY_NUM") return "ANY_NUM";
	if (left.type === "TIME" || right.type === "TIME") {
		if (operator === "+" || operator === "-")
			return left.type === "TIME" && right.type === "TIME" ? "TIME" : null;
		return left.type === "TIME" && right.type !== "TIME" ? "TIME" : null;
	}
	return unifyNumericTypes(left, right);
}

/** `true` if a value of type `value` can be assigned to a variable of type `target` without an
 * explicit conversion. */
export function isImplicitlyAssignable(
	value: TypedNumber,
	target: NumericType,
): boolean {
	if (value.type === "ANY_NUM" || target === "ANY_NUM") return true;
	if (isConstantType(value.type)) return constantFits(value, target);
	return widensTo(value.type, target);
}
