import ParserException from "./parser.exception";

/**
 * An expression that does not parse and contains a word that is a keyword of another dialect
 * than the one it is read in (`AND` in a French expression).
 */
export default class ForeignKeywordException extends ParserException {
	private readonly word: string;

	constructor(word: string, position: number) {
		super(
			`Unexpected word "${word}": it is a keyword of another dialect, at position ${position}`,
			position,
		);
		this.word = word;
	}

	getWord(): string {
		return this.word;
	}
}
