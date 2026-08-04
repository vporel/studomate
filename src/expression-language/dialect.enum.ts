/**
 * Dialects of the expression language: the same language, with a localised keyword
 * vocabulary (`ET`/`AND`, `VRAI`/`TRUE`...).
 *
 * Deliberately *not* named `Language`: the interface is in French and is not meant to be
 * translated. What varies here is only how expressions are written — some people prefer
 * `Btn1 AND Btn2` to `Btn1 ET Btn2`.
 *
 * The dialect belongs to the **project**, not to the user: expressions are stored as text, so
 * the dialect that wrote them has to travel with them.
 */
export enum Dialect {
	FR,
	EN,
}
