import EnvironmentException from "./environment.exception";

export default class UnknownVariableNameException extends EnvironmentException {
	private readonly variableName: string;

	constructor(variableName: string) {
		super(`Variable of name ${variableName} is not defined`);
		this.variableName = variableName;
	}

	getVariableName(): string {
		return this.variableName;
	}
}
