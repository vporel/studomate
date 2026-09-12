import {
	isDigit,
	isLetterOrUnderscore,
	isLetterOrUnderscoreOrDigit,
	isQuote,
} from "./alphabet";
import { getKeywordsStringsForDialect } from "./keywords";
import { Dialect } from "@/expression-language/dialect.enum";

type IdentifierOccurrence = { start: number; end: number; name: string };

/**
 * Renames identifiers inside an expression of the simulator language.
 *
 * Substitution is occurrence-based, never a raw text replacement. This is what makes it
 * safe where `String.replace`/`split().join()` is not:
 * - a mnemonic that is a prefix or a suffix of another one (`moteur` vs `moteur_1`) is left alone;
 * - occurrences inside string literals are left alone;
 * - keywords of the language (ET, OU, VRAI...) are never renamed;
 * - the unit of a duration literal (the `ms` of `100ms`) is not mistaken for an identifier.
 *
 * All renames are applied in a single pass, so chained renames cannot cascade
 * (renaming a→b and b→c at once never turns an original `a` into `c`).
 *
 * ## Why a tolerant scan rather than the Lexer
 *
 * Expressions are plain strings while the user edits them: they are only lexed and parsed
 * when an analysis or a simulation is started. A half-typed expression is therefore the
 * normal case, not the exception, and the Lexer throws on anything outside its alphabet
 * (a comma, a `%`, an accented letter, an unterminated string...).
 *
 * Refusing to rename in that situation would silently leave a stale mnemonic behind, and the
 * user would only discover it at the next analysis. So this scanner never fails: whatever it
 * does not recognise is copied through untouched.
 */
export default class IdentifierRenamer {
	/**
	 * @param expression The expression to rewrite
	 * @param renames Map of old identifier name → new identifier name
	 * @param dialect Dialect of the keywords, so that they are not mistaken for identifiers
	 * @returns The rewritten expression. Whitespace and formatting are preserved:
	 * only the identifier occurrences are replaced.
	 */
	static rename(
		expression: string,
		renames: Record<string, string>,
		dialect: Dialect = Dialect.FR,
	): string {
		if (!expression || Object.keys(renames).length === 0) return expression;

		const occurrences = this.scanIdentifiers(expression, dialect).filter(
			(o) => renames[o.name] !== undefined,
		);
		if (occurrences.length === 0) return expression;

		let result = "";
		let cursor = 0;
		for (const { start, end, name } of occurrences) {
			result += expression.slice(cursor, start) + renames[name];
			cursor = end;
		}
		return result + expression.slice(cursor);
	}

	/**
	 * @returns true if at least one of the identifiers is actually used in the expression.
	 * Uses the same reading as `rename`, so it never reports a false positive on a substring
	 * or on text inside a string literal.
	 */
	static usesAnyIdentifier(
		expression: string,
		identifiers: string[],
		dialect: Dialect = Dialect.FR,
	): boolean {
		if (!expression || identifiers.length === 0) return false;
		return this.scanIdentifiers(expression, dialect).some((o) =>
			identifiers.includes(o.name),
		);
	}

	/**
	 * Locates every identifier occurrence in the expression.
	 * Never throws: unrecognised characters are simply skipped.
	 */
	private static scanIdentifiers(
		expression: string,
		dialect: Dialect,
	): IdentifierOccurrence[] {
		const keywords = getKeywordsStringsForDialect(dialect);
		const occurrences: IdentifierOccurrence[] = [];
		let position = 0;

		while (position < expression.length) {
			const char = expression[position];

			//String literal: skipped whole, so its content is never renamed.
			//An unterminated string runs to the end of the expression, which is fine here.
			if (isQuote(char)) {
				const quote = char;
				position++;
				while (position < expression.length && expression[position] !== quote)
					position++;
				position++; //closing quote (or past the end, harmless)
				continue;
			}

			//Number literal, including the unit of a duration (100ms, 2s...), so that the
			//unit is not read as an identifier
			if (isDigit(char)) {
				while (
					position < expression.length &&
					(isDigit(expression[position]) || expression[position] === ".")
				)
					position++;
				while (
					position < expression.length &&
					isLetterOrUnderscore(expression[position])
				)
					position++;
				continue;
			}

			//Identifier or keyword
			if (isLetterOrUnderscore(char)) {
				const start = position;
				while (
					position < expression.length &&
					isLetterOrUnderscoreOrDigit(expression[position])
				)
					position++;
				const name = expression.slice(start, position);
				if (!keywords.includes(name.toUpperCase())) {
					occurrences.push({ start, end: position, name });
				}
				continue;
			}

			//Anything else (operators, parentheses, but also characters the Lexer would
			//reject) is irrelevant here and simply skipped
			position++;
		}

		return occurrences;
	}
}
