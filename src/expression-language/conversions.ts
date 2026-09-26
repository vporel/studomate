/**
 * IEC 61131-3 type conversion functions (`DINT_TO_INT`, `INT_TO_REAL`...). Their names are the
 * standard ones, identical in every dialect.
 */
export const CONVERTIBLE_TYPES = ["INT", "DINT", "WORD", "DWORD", "REAL"] as const;

export type ConvertibleType = (typeof CONVERTIBLE_TYPES)[number];

const BIT_STRING_TYPES: readonly ConvertibleType[] = ["WORD", "DWORD"];

/** The standard defines no value conversion between a real and a bit string. */
export function isConversionSupported(
	source: ConvertibleType,
	target: ConvertibleType,
): boolean {
	if (source === target) return false;
	const realAndBitString =
		(source === "REAL" && BIT_STRING_TYPES.includes(target)) ||
		(target === "REAL" && BIT_STRING_TYPES.includes(source));
	return !realAndBitString;
}

export function isConvertibleType(type: string): type is ConvertibleType {
	return (CONVERTIBLE_TYPES as readonly string[]).includes(type);
}

export function getConversionFunctionName(
	source: ConvertibleType,
	target: ConvertibleType,
): string {
	return `${source}_TO_${target}`;
}

/** Source and target types of a conversion function name (case-insensitive), or `null`. */
export function parseConversionFunctionName(
	name: string,
): { source: ConvertibleType; target: ConvertibleType } | null {
	const match = /^([A-Z]+)_TO_([A-Z]+)$/.exec(name.toUpperCase());
	if (!match) return null;
	const [, source, target] = match;
	if (!isConvertibleType(source) || !isConvertibleType(target)) return null;
	if (!isConversionSupported(source, target)) return null;
	return { source, target };
}
