/**
 * Constante numérique brute (entier ou décimal, signe optionnel) — pendant de `time-literal.ts`
 * pour une pinoche paramètre qui accepte un littéral numérique en plus d'un nom de variable
 * (ex. PV d'un bloc compteur), sans le formalisme d'unités d'une constante TIME.
 */
const NUMBER_LITERAL_REGEX = /^-?\d+(\.\d+)?$/;

/** `true` si `text` a la forme d'un littéral numérique — utile pour distinguer une constante
 * d'un nom de variable avant d'appeler `parseNumberLiteral`. */
export function isNumberLiteral(text: string): boolean {
	return NUMBER_LITERAL_REGEX.test(text.trim());
}

/** Parse un littéral numérique, ou `null` si `text` n'en est pas un valide. */
export function parseNumberLiteral(text: string): number | null {
	const trimmed = text.trim();
	if (!isNumberLiteral(trimmed)) return null;
	return Number(trimmed);
}
