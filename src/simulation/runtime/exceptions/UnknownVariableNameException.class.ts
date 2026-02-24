import RuntimeException from "./RuntimeException.class";

export default class UnknownVariableNameException extends RuntimeException {
	private readonly variableName: string;

	constructor(variableName: string) {
		super(`Variable of name ${variableName} is not defined`);
		this.variableName = variableName;
	}

	getVariableName(): string {
		return this.variableName;
	}
}
