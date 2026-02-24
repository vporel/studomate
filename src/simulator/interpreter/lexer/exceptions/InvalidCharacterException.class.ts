import LexerException from "./LexerException.class";

export default class InvalidCharacterException extends LexerException {
	private readonly char: string;

	constructor(char: string, position: number) {
		super(`Unexpected character '${char}' at position ${position}`, position);
		this.char = char;
	}

	public getChar(): string {
		return this.char;
	}
}
