import { Keyword } from "@/expression-language/keyword.enum";
import { Dialect } from "@/expression-language/dialect.enum";

/**
 * Vocabulary of the expression language, one keyword set per dialect.
 *
 * Belongs to the *definition* of the language: knowing that `ET` is a keyword and not
 * an identifier is needed by the lexer, but also by the editor (to avoid renaming a
 * keyword) and, later, by syntax highlighting or autocompletion.
 *
 * The mapping keyword → TokenType, on the other hand, is specific to the lexer and
 * stays there.
 */
const KEYWORDS_BY_DIALECT: Record<Dialect, Record<Keyword, string>> = {
	[Dialect.FR]: {
		[Keyword.TRUE]: "VRAI",
		[Keyword.FALSE]: "FAUX",
		[Keyword.AND]: "ET",
		[Keyword.OR]: "OU",
		[Keyword.NOT]: "NON",
	},
	[Dialect.EN]: {
		[Keyword.TRUE]: "TRUE",
		[Keyword.FALSE]: "FALSE",
		[Keyword.AND]: "AND",
		[Keyword.OR]: "OR",
		[Keyword.NOT]: "NOT",
	},
};

export function getKeywordsStringsForDialect(dialect: Dialect): string[] {
	return Object.values(KEYWORDS_BY_DIALECT[dialect]);
}

export function getKeywordByString(
	value: string,
	dialect: Dialect,
): Keyword | null {
	const keywordsForDialect = KEYWORDS_BY_DIALECT[dialect];
	for (const [keyword, keywordString] of Object.entries(keywordsForDialect)) {
		if (keywordString.toUpperCase() === value.toUpperCase()) {
			return keyword as Keyword;
		}
	}
	return null;
}

/**
 * Écriture d'un mot-clé dans un dialecte donné.
 */
export function getKeywordString(keyword: Keyword, dialect: Dialect): string {
	return KEYWORDS_BY_DIALECT[dialect][keyword];
}
