import Token from "../../lexer/tokens/Token.interface";
import ParserException from "./ParserException.class";

export default class ParsingEndedBeforeEOFException extends ParserException {
	private readonly token: Token;

	constructor(token: Token) {
		super(
			`Parsing ended before EOF, unexpected/unknown token of type ${token.type} at position ${token.position}`,
			token.position,
		);
		this.token = token;
	}

	getToken(): Token {
		return this.token;
	}
}
