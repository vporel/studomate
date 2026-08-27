import EnvVariable, {
	EnvVariableDirection,
	EnvVariableType,
	EnvVariableValue,
} from "./env-variable";
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

	/** Ids des variables dont la valeur est imposée : tout write est ignoré silencieusement. */
	private forcedVariableIds: ReadonlySet<string>;

	constructor(
		variables: EnvVariable[],
		forcedVariableIds: ReadonlySet<string> = new Set(),
	) {
		this.forcedVariableIds = forcedVariableIds;
		for (const variable of variables) {
			this.variables.set(variable.getId(), variable);
			this.variablesByName.set(variable.getName(), variable);
		}
	}

	/** Remplace la table de forçage — un même environnement est réutilisé de cycle en cycle
	 * alors que l'ensemble des variables forcées, lui, change. */
	setForcedVariableIds(forcedVariableIds: ReadonlySet<string>): void {
		this.forcedVariableIds = forcedVariableIds;
	}

	/** Charge la valeur courante d'une variable en début de cycle, sans passer par le garde de
	 * forçage : les images du PLC portent déjà la valeur imposée. Le contrôle de type reste fait. */
	hydrateVariableValue(id: string, value: EnvVariableValue): void {
		this.getVariableById(id).setValue(value);
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
		return this.variables.has(id);
	}

	existsVariableWithName(name: string): boolean {
		return this.variablesByName.has(name);
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
		if (this.forcedVariableIds.has(id)) return;
		const variable = this.getVariableById(id);
		variable.setValue(value);
	}

	setVariableValueByName(name: string, value: EnvVariableValue): void {
		const variable = this.getVariableByName(name);
		if (this.forcedVariableIds.has(variable.getId())) return;
		variable.setValue(value);
	}
}
