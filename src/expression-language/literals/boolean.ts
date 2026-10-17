import { Dialect } from "../dialect.enum";
import { Keyword } from "../keyword.enum";
import { getKeywordString } from "../keywords";

/** Valeur du littéral booléen `vrai`/`faux` (ou `true`/`false`) du dialecte donné, `null` si `text`
 * n'en est pas un. Insensible à la casse, comme le lexer. */
export function parseBooleanLiteral(
	text: string,
	dialect: Dialect,
): boolean | null {
	const trimmed = text.trim().toUpperCase();
	if (trimmed === getKeywordString(Keyword.TRUE, dialect).toUpperCase())
		return true;
	if (trimmed === getKeywordString(Keyword.FALSE, dialect).toUpperCase())
		return false;
	return null;
}

/** `true` si `text` est le mot-clé booléen `vrai`/`faux` (ou `true`/`false`) du dialecte donné —
 * pendant de `isNumberLiteral`/`isTimeLiteral` pour une pinoche qui accepte un littéral booléen. */
export function isBooleanLiteral(text: string, dialect: Dialect): boolean {
	return parseBooleanLiteral(text, dialect) !== null;
}
