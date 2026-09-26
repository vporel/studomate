import { getKeywordsStringsForDialect } from "./keywords";
import scanWords from "./scan-words";
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
 * Identifiers are located with `scanWords`, which never fails on a half-typed expression:
 * refusing to rename there would silently leave a stale mnemonic behind.
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
	 * Never throws.
	 */
	private static scanIdentifiers(
		expression: string,
		dialect: Dialect,
	): IdentifierOccurrence[] {
		const keywords = getKeywordsStringsForDialect(dialect);
		const occurrences: IdentifierOccurrence[] = [];
		scanWords(expression, (name, start, end) => {
			if (!keywords.includes(name.toUpperCase())) {
				occurrences.push({ start, end, name });
			}
		});
		return occurrences;
	}
}
