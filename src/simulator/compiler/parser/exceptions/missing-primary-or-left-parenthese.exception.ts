import { Token } from "@/simulator/compiler/lexer/tokens/tokens";
import ParserException from "./parser.exception";

export default class MissingPrimaryOrLeftParentheseException extends ParserException {
	private readonly token: Token;

	constructor(token: Token) {
		super(
			`Expected primary (identifier, number, string) or '(' at position ${token.position}`,
			token.position,
		);
		this.token = token;
	}

	getToken(): Token {
		return this.token;
	}
}
