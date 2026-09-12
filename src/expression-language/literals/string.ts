/** `true` si `text` a la forme d'un littéral chaîne : `"..."` ou `'...'`, sans quote du même
 * type à l'intérieur (le lexer ne gère pas d'échappement — voir `isQuote`). Pendant de
 * `isNumberLiteral`/`isTimeLiteral` pour une pinoche qui accepte un littéral chaîne. */
const STRING_LITERAL_REGEX = /^"[^"]*"$|^'[^']*'$/;

export function isStringLiteral(text: string): boolean {
	return STRING_LITERAL_REGEX.test(text.trim());
}
