import { TokenType } from "../../lexer/tokens/tokens";
import ParserException from "./parser.exception";

export default class BadTokenTypeException extends ParserException {
	private readonly expected: TokenType[];
	private readonly actual: TokenType;

	constructor(expected: TokenType[], actual: TokenType, position: number) {
		super(`Expected token type '${expected}' but got '${actual}' at position ${position}`, position);
		this.expected = expected;
		this.actual = actual;
	}

	getExpected(): TokenType[] {
		return this.expected;
	}

	getActual(): TokenType {
		return this.actual;
	}
}
