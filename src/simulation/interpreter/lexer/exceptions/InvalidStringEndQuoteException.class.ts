import LexerException from "./LexerException.class";

export default class InvalidStringEndQuoteException extends LexerException {
	private readonly quoteType: string;

	constructor(quoteType: string, position: number) {
		super(`Invalid end quote '${quoteType}' for string at position ${position}`, position);

		this.quoteType = quoteType;
	}

	public getQuoteType(): string {
		return this.quoteType;
	}
}
