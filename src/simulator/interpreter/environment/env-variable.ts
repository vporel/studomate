import { coerceToRange, NumericRange } from "@/lib/numeric-range";
import IllegalVariableValueTypeException from "./exceptions/illegal-variable-value-type.exception";

export type EnvVariableType = "number" | "string" | "boolean";
export type EnvVariableDirection = "IN" | "OUT" | "INOUT";
export type EnvVariableValue = number | string | boolean;

export default class EnvVariable {
	private id: string;
	private name: string;
	private type: EnvVariableType;
	private direction: EnvVariableDirection;
	private value: EnvVariableValue;
	/** Domaine du type numérique d'origine (INT, WORD…) — toute valeur écrite y est ramenée. */
	private numericRange: NumericRange | null;

	constructor(
		id: string,
		name: string,
		type: EnvVariableType,
		direction: EnvVariableDirection,
		numericRange: NumericRange | null = null,
	) {
		this.id = id;
		this.name = name;
		this.type = type;
		this.direction = direction;
		this.numericRange = numericRange;
		switch (type) {
			case "number":
				this.value = 0;
				break;
			case "string":
				this.value = "";
				break;
			case "boolean":
				this.value = false;
				break;
		}
	}

	getId(): string {
		return this.id;
	}

	getName(): string {
		return this.name;
	}

	getType(): EnvVariableType {
		return this.type;
	}

	getNumericRange(): NumericRange | null {
		return this.numericRange;
	}

	getDirection(): EnvVariableDirection {
		return this.direction;
	}

	getValue(): EnvVariableValue {
		return this.value;
	}

	setValue(value: EnvVariableValue): void {
		const valueType = typeof value;
		if (valueType !== this.type) {
			throw new IllegalVariableValueTypeException(
				this.id,
				this.name,
				this.type,
				valueType,
			);
		}
		this.value =
			typeof value === "number" && this.numericRange
				? coerceToRange(value, this.numericRange)
				: value;
	}
}
