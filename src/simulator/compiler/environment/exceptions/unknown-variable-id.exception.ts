import EnvironmentException from "./environment.exception";

export default class UnknownVariableIdException extends EnvironmentException {
	private readonly variableId: string;

	constructor(variableId: string) {
		super(`Variable of id ${variableId} is not defined`);
		this.variableId = variableId;
	}

	getVariableId(): string {
		return this.variableId;
	}
}
