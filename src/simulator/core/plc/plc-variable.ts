import { NumericRange } from "@/lib/numeric-range";

export type PLCVariableScope = "input" | "output" | "memory";
export type PLCVariableType = "boolean" | "number" | "string";
export type PLCVariableValue = boolean | number | string;

export default class PLCVariable {
	private id: string;
	private name: string;
	private scope: PLCVariableScope;
	private type: PLCVariableType;
	private value: PLCVariableValue;
	/** Domaine du type numérique d'origine (INT, WORD…) à faire respecter en simulation. */
	private numericRange: NumericRange | null;

	constructor(
		id: string,
		name: string,
		scope: PLCVariableScope,
		type: PLCVariableType,
		numericRange: NumericRange | null = null,
	) {
		this.id = id;
		this.name = name;
		this.scope = scope;
		this.type = type;
		this.numericRange = numericRange;
		if (scope !== "memory" && type === "string")
			throw new Error("A string variable is only allowed for the memory scope");
		this.value = type === "boolean" ? false : type === "number" ? 0 : "";
	}

	public getId(): string {
		return this.id;
	}

	public getName(): string {
		return this.name;
	}

	public getScope(): PLCVariableScope {
		return this.scope;
	}

	public getType(): PLCVariableType {
		return this.type;
	}

	public getNumericRange(): NumericRange | null {
		return this.numericRange;
	}

	public getValue(): PLCVariableValue {
		return this.value;
	}

	public setValue(value: PLCVariableValue): void {
		if (typeof value !== this.type)
			throw new Error("The type of the value does not match the variable type");
		this.value = value;
	}

	public copy(): PLCVariable {
		const copy = new PLCVariable(
			this.id,
			this.name,
			this.scope,
			this.type,
			this.numericRange,
		);
		copy.value = this.value;
		return copy;
	}
}
