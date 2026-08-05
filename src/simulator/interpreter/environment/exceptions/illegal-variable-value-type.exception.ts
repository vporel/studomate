import EnvironmentException from "./environment.exception";

export default class IllegalVariableValueTypeException extends EnvironmentException {
	private readonly variableId: string;
	private readonly variableName: string;
	private readonly expectedType: string;
	private readonly actualType: string;

	constructor(variableId: string, variableName: string, expectedType: string, actualType: string) {
		super(
			`Variable ${variableName} (id: ${variableId}) expected a value of type ${expectedType} but got ${actualType}`,
		);
		this.variableId = variableId;
		this.variableName = variableName;
		this.expectedType = expectedType;
		this.actualType = actualType;
	}

	getVariableId(): string {
		return this.variableId;
	}

	getVariableName(): string {
		return this.variableName;
	}

	getExpectedType(): string {
		return this.expectedType;
	}

	getActualType(): string {
		return this.actualType;
	}
}
