import { Dialect } from "@/expression-language/dialect.enum";
import Variable from "@/schemas/variable/variable.schema";

//VRAI/TRUE relève du vocabulaire du langage d'expression, pas de la langue de l'interface
export function formatBooleanValue(
	value: boolean | undefined,
	dialect: Dialect,
): string {
	if (value === undefined) return "-";
	if (value) return dialect === Dialect.FR ? "VRAI" : "TRUE";
	else return dialect === Dialect.FR ? "FAUX" : "FALSE";
}

/** Formate une durée TIME (en ms) dans la plus grande unité s/m/h/d où elle reste ≥ 1, avec
 * décimales tronquées (`200` → `"0.2s"`, `5000` → `"5s"`, `5_400_000` → `"1.5h"`). */
export function formatTimeValue(ms: number): string {
	const seconds = ms / 1000;
	let value: number;
	let unit: string;
	if (seconds < 60) {
		value = seconds;
		unit = "s";
	} else if (seconds < 3600) {
		value = seconds / 60;
		unit = "m";
	} else if (seconds < 86400) {
		value = seconds / 3600;
		unit = "h";
	} else {
		value = seconds / 86400;
		unit = "d";
	}
	return `${Number(value.toFixed(2))}${unit}`;
}

/** Formate la valeur courante (simulation) d'une variable selon son type — `undefined` si `value`
 * n'est pas encore connue. */
export function formatVariableValue(
	variable: Variable,
	value: unknown,
	dialect: Dialect,
): string | undefined {
	if (value === undefined) return undefined;
	if (variable.getNativeType() === "boolean")
		return formatBooleanValue(value as boolean, dialect);
	if (variable.type === "TIME") return formatTimeValue(value as number);
	return String(value);
}
