import ParserException from "./parser.exception";

export default class UnknownFunctionException extends ParserException {
	private readonly functionName: string;

	constructor(functionName: string, position: number) {
		super(`Unknown function '${functionName}' at position ${position}`, position);
		this.functionName = functionName;
	}

	getFunctionName(): string {
		return this.functionName;
	}
}
