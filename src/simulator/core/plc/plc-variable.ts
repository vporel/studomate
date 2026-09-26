import { coerceToRange, NumericRange } from "@/lib/numeric-range";
import type { VariableType } from "@/schemas/variable/variable.schema";

export type PLCVariableScope = "input" | "output" | "memory";
export type PLCVariableType = "boolean" | "number" | "string";
export type PLCVariableValue = boolean | number | string;

export default class PLCVariable {
	private id: string;
	private name: string;
	private scope: PLCVariableScope;
	private type: PLCVariableType;
	private value: PLCVariableValue;
	/** Domaine du type numérique d'origine (INT, WORD…) ou bornes d'un curseur, appliqué à
	 * chaque écriture. */
	private numericRange: NumericRange | null;
	/** Declared PLC type, used by the typing rules of the language (`null` for an internal
	 * variable such as a step memo). */
	private declaredType: VariableType | null;

	constructor(
		id: string,
		name: string,
		scope: PLCVariableScope,
		type: PLCVariableType,
		numericRange: NumericRange | null = null,
		declaredType: VariableType | null = null,
	) {
		this.id = id;
		this.name = name;
		this.scope = scope;
		this.type = type;
		this.numericRange = numericRange;
		this.declaredType = declaredType;
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

	public getDeclaredType(): VariableType | null {
		return this.declaredType;
	}

	public getValue(): PLCVariableValue {
		return this.value;
	}

	public setValue(value: PLCVariableValue): void {
		if (typeof value !== this.type)
			throw new Error("The type of the value does not match the variable type");
		this.value =
			typeof value === "number" && this.numericRange
				? coerceToRange(value, this.numericRange)
				: value;
	}

	public copy(): PLCVariable {
		const copy = new PLCVariable(
			this.id,
			this.name,
			this.scope,
			this.type,
			this.numericRange,
			this.declaredType,
		);
		copy.value = this.value;
		return copy;
	}
}
