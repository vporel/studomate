import LexerException from "./lexer.exception";

export default class UnterminatedStringException extends LexerException {
	private readonly quoteType: string;

	constructor(quoteType: string, position: number) {
		super(`Unterminated string starting with ${quoteType} at position ${position}`, position);
		this.quoteType = quoteType;
	}

	public getQuoteType(): string {
		return this.quoteType;
	}
}
