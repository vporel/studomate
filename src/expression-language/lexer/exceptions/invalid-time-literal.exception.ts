import LexerException from "./lexer.exception";

export default class InvalidTimeLiteralException extends LexerException {
	private readonly literal: string;

	constructor(literal: string, position: number) {
		super(`Invalid TIME constant '${literal}' at position ${position}`, position);
		this.literal = literal;
	}

	public getLiteral(): string {
		return this.literal;
	}
}
