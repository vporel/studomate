/**
 * Character classes of the expression language.
 *
 * This is part of the *definition* of the language, not of any particular way of
 * consuming it: the lexer uses it to produce tokens, and the editor uses it to read
 * expressions while the user is still typing them.
 */
export function isLetterOrUnderscore(char: string): boolean {
	return /^[a-zA-Z_]$/.test(char);
}

export function isLetterOrUnderscoreOrDigit(char: string): boolean {
	return /^[a-zA-Z0-9_]$/.test(char);
}

export function isDigit(char: string): boolean {
	return /^[0-9]$/.test(char);
}

export function isQuote(char: string): boolean {
	return char === '"' || char === "'";
}
