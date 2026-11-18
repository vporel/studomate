import ParserException from "./parser.exception";

/**
 * A duration (`5s`) outside of the two timer forms `t1/X1/5s` and `5s/X1`, or an identifier
 * followed by `/` and a duration that is not the start of a `t1/X1/5s` timer (`t1/5s/X1`,
 * `X1/5s`).
 */
export default class MalformedTimerException extends ParserException {
	constructor(position: number) {
		super(
			`Malformed timer at position ${position}: expected t1/X1/5s or 5s/X1`,
			position,
		);
	}
}
