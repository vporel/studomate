import RuntimeException from "./RuntimeException.class";

export default class UnknownVariableIdException extends RuntimeException {
	private readonly variableId: string;

	constructor(variableId: string) {
		super(`Variable of id ${variableId} is not defined`);
		this.variableId = variableId;
	}

	getVariableId(): string {
		return this.variableId;
	}
}
