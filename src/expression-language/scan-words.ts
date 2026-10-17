import {
	isDigit,
	isLetterOrUnderscore,
	isLetterOrUnderscoreOrDigit,
	isQuote,
} from "./alphabet";
import { findTimeLiteralEnd } from "./literals/time";

/**
 * Calls `onWord` for every identifier or keyword of an expression, with its
 * `[start, end)` offsets. String literals, numbers (unit of a duration included, `100ms`)
 * and TIME constants (`T#5s`) are skipped, so their letters are never reported as words.
 *
 * Tolerant scan rather than the Lexer: expressions are plain strings while the user edits
 * them, so a half-typed expression is the normal case, and the Lexer throws on anything outside
 * its alphabet (a comma, a `%`, an accented letter, an unterminated string...). This scan never
 * fails: whatever it does not recognise is skipped.
 */
export default function scanWords(
	expression: string,
	onWord: (word: string, start: number, end: number) => void,
): void {
	let position = 0;

	while (position < expression.length) {
		const char = expression[position];

		//An unterminated string runs to the end of the expression
		if (isQuote(char)) {
			const quote = char;
			position++;
			while (position < expression.length && expression[position] !== quote)
				position++;
			position++; //closing quote (or past the end, harmless)
			continue;
		}

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

		const timeLiteralEnd = findTimeLiteralEnd(expression, position);
		if (timeLiteralEnd !== null) {
			position = timeLiteralEnd;
			continue;
		}

		if (isLetterOrUnderscore(char)) {
			const start = position;
			while (
				position < expression.length &&
				isLetterOrUnderscoreOrDigit(expression[position])
			)
				position++;
			onWord(expression.slice(start, position), start, position);
			continue;
		}

		position++;
	}
}
