import IllegalVariableValueTypeException from "./exceptions/IllegalVariableValueTypeException.class";

export type VariableType = "number" | "string" | "boolean";
export type VariableDirection = "IN" | "OUT" | "INOUT";
export type VariableValue = number | string | boolean;

export default class Variable {
	private id: string;
	private name: string;
	private type: VariableType;
	private direction: VariableDirection;
	private value: VariableValue;

	constructor(id: string, name: string, type: VariableType, direction: VariableDirection) {
		this.id = id;
		this.name = name;
		this.type = type;
		this.direction = direction;
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

	getType(): VariableType {
		return this.type;
	}

	getDirection(): VariableDirection {
		return this.direction;
	}

	getValue(): VariableValue {
		return this.value;
	}

	setValue(value: VariableValue): void {
		const valueType = typeof value;
		if (valueType !== this.type) {
			throw new IllegalVariableValueTypeException(this.id, this.name, this.type, valueType);
		}
		this.value = value;
	}
}
