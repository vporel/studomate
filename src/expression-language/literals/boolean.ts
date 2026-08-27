import { Dialect } from "../dialect.enum";
import { Keyword } from "../keyword.enum";
import { getKeywordString } from "../keywords";

/** `true` si `text` est le mot-clé booléen `vrai`/`faux` (ou `true`/`false`) du dialecte donné —
 * pendant de `isNumberLiteral`/`isTimeLiteral` pour une pinoche qui accepte un littéral booléen.
 * Insensible à la casse, comme le lexer. */
export function isBooleanLiteral(text: string, dialect: Dialect): boolean {
	const trimmed = text.trim().toUpperCase();
	return (
		trimmed === getKeywordString(Keyword.TRUE, dialect).toUpperCase() ||
		trimmed === getKeywordString(Keyword.FALSE, dialect).toUpperCase()
	);
}
