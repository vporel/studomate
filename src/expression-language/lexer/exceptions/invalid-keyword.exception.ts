import LexerException from "./lexer.exception";

export default class InvalidKeywordException extends LexerException {
	private readonly keyword: string;

	constructor(keyword: string, position: number) {
		super(`Invalid keyword '${keyword}' at position ${position}`, position);
		this.keyword = keyword;
	}

	public getKeyword(): string {
		return this.keyword;
	}
}
