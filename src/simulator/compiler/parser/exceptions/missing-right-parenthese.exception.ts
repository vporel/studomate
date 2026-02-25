import ParserException from "./parser.exception";

export default class MissingRightParentheseException extends ParserException {
	private readonly end: boolean;

	constructor(position: number, end: boolean) {
		super(`Missing right parenthese at position ${position}`, position);
		this.end = end;
	}

	isEnd(): boolean {
		return this.end;
	}
}
