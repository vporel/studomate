import EnvVariable, { EnvVariableDirection, EnvVariableType, EnvVariableValue } from "./env-variable";
import UnknownVariableIdException from "./exceptions/unknown-variable-id.exception";
import UnknownVariableNameException from "./exceptions/unknown-variable-name.exception";

export class Environment {
	/**
	 * The keys are the variables ids
	 */
	private readonly variables = new Map<string, EnvVariable>();

	/**
	 * Same variables, indexed by name — evaluation resolves identifiers by name on every
	 * reference, once per scan cycle, so this must be an O(1) lookup rather than a scan.
	 */
	private readonly variablesByName = new Map<string, EnvVariable>();

	constructor(variables: EnvVariable[]) {
		for (const variable of variables) {
			this.variables.set(variable.getId(), variable);
			this.variablesByName.set(variable.getName(), variable);
		}
	}

	private getVariableById(id: string): EnvVariable {
		if (!this.variables.has(id)) {
			throw new UnknownVariableIdException(id);
		}
		return this.variables.get(id)!;
	}

	private getVariableByName(name: string): EnvVariable {
		const variable = this.variablesByName.get(name);
		if (!variable) {
			throw new UnknownVariableNameException(name);
		}
		return variable;
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

	getVariableTypeById(id: string): EnvVariableType {
		return this.getVariableById(id).getType();
	}

	getVariableTypeByName(name: string): EnvVariableType {
		return this.getVariableByName(name).getType();
	}

	getVariableDirectionById(id: string): EnvVariableDirection {
		return this.getVariableById(id).getDirection();
	}

	getVariableDirectionByName(name: string): EnvVariableDirection {
		return this.getVariableByName(name).getDirection();
	}

	getVariableValueById(id: string): EnvVariableValue {
		return this.getVariableById(id).getValue();
	}

	getVariableValueByName(name: string): EnvVariableValue {
		return this.getVariableByName(name).getValue();
	}

	setVariableValueById(id: string, value: EnvVariableValue): void {
		const variable = this.getVariableById(id);
		variable.setValue(value);
	}

	setVariableValueByName(name: string, value: EnvVariableValue): void {
		const variable = this.getVariableByName(name);
		variable.setValue(value);
	}
}
