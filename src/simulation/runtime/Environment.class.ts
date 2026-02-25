import UnknownVariableIdException from "./exceptions/UnknownVariableIdException.class";
import UnknownVariableNameException from "./exceptions/UnknownVariableNameException.class";
import Variable, { VariableDirection, VariableType, VariableValue } from "./Variable.class";

export class Environment {
	/**
	 * The keys are the variables ids
	 */
	private readonly variables = new Map<string, Variable>();

	constructor(
		variablesDefinitions: {
			id: string;
			name: string;
			type: VariableType;
			direction: VariableDirection;
		}[],
	) {
		for (const variableDef of variablesDefinitions) {
			const variable = new Variable(
				variableDef.id,
				variableDef.name,
				variableDef.type,
				variableDef.direction,
			);
			this.variables.set(variable.getId(), variable);
		}
	}

	private getVariableById(id: string): Variable {
		if (!this.variables.has(id)) {
			throw new UnknownVariableIdException(id);
		}
		return this.variables.get(id)!;
	}

	private getVariableByName(name: string): Variable {
		for (const variable of this.variables.values()) {
			if (variable.getName() === name) {
				return variable;
			}
		}
		throw new UnknownVariableNameException(name);
	}

	existsVariableWithId(id: string): boolean {
		try {
			this.getVariableById(id);
			return true;
		} catch (e) {
			if (e instanceof UnknownVariableIdException) {
				return false;
			}
			throw e;
		}
	}

	existsVariableWithName(name: string): boolean {
		try {
			this.getVariableByName(name);
			return true;
		} catch (e) {
			if (e instanceof UnknownVariableNameException) {
				return false;
			}
			throw e;
		}
	}

	getVariableTypeById(id: string): VariableType {
		return this.getVariableById(id).getType();
	}

	getVariableTypeByName(name: string): VariableType {
		return this.getVariableByName(name).getType();
	}

	getVariableDirectionById(id: string): VariableDirection {
		return this.getVariableById(id).getDirection();
	}

	getVariableDirectionByName(name: string): VariableDirection {
		return this.getVariableByName(name).getDirection();
	}

	getVariableValueById(id: string): VariableValue {
		return this.getVariableById(id).getValue();
	}

	getVariableValueByName(name: string): VariableValue {
		return this.getVariableByName(name).getValue();
	}

	setVariableValueById(id: string, value: VariableValue): void {
		const variable = this.getVariableById(id);
		variable.setValue(value);
	}

	setVariableValueByName(name: string, value: VariableValue): void {
		const variable = this.getVariableByName(name);
		variable.setValue(value);
	}
}
