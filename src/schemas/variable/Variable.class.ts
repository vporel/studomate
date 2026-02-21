export type VariableZone = "logic-input" | "logic-output" | "analog-input" | "analog-output" | "memory";
export type VariableDirection = "IN" | "OUT";
export type VariableType =
	| "BOOL"
	| "INT"
	| "LONG"
	| "WORD"
	| "DWORD"
	| "REAL"
	| "STRING"
	| "TON"
	| "TOFF"
	| "TP";

export const ZoneToTypeMap: Record<VariableZone, VariableType[]> = {
	"logic-input": ["BOOL"],
	"logic-output": ["BOOL"],
	"analog-input": ["INT", "WORD", "DWORD"],
	"analog-output": ["INT", "WORD", "DWORD"],
	memory: ["BOOL", "INT", "LONG", "WORD", "DWORD", "REAL", "STRING", "TON", "TOFF", "TP"],
};

export type VariableUpdatableFields = Pick<Variable, "mnemonic" | "zone" | "type" | "address" | "comment">;

export default class Variable {
	id: string;
	mnemonic: string;
	zone: VariableZone;
	direction: VariableDirection | null;
	type: VariableType;
	address?: string;
	comment?: string;

	constructor(id: string, mnemonic: string, zone: VariableZone, type: VariableType) {
		this.id = id;
		this.mnemonic = mnemonic;
		this.zone = zone;
		this.direction = zone.includes("input") ? "IN" : zone.includes("output") ? "OUT" : null;
		this.type = type;

		const zoneTypeErrors = Variable.validateZoneType(zone, type);
		if (zoneTypeErrors.length > 0) {
			throw new Error(zoneTypeErrors.join(", "));
		}
	}

	update(updatedFields: Partial<VariableUpdatableFields>): Variable {
		const copiedVariable = this.copy();
		Object.assign(copiedVariable, updatedFields);
		const errors = Variable.validate(copiedVariable);
		if (errors.length > 0) {
			throw new Error("Errors while updating variable: " + errors.join(", "));
		}
		Object.assign(this, updatedFields);
		return this;
	}

	copy(): Variable {
		return Object.assign(new Variable("", "", "memory", "BOOL"), this);
	}

	static createFromJSON(json: string): Variable {
		const jsonParsed = JSON.parse(json);
		return Object.assign(new Variable("", "", "memory", "BOOL"), jsonParsed);
	}

	static validateMnemonic(mnemonic: string): string[] {
		const errors: string[] = [];
		if (mnemonic.length == 0) errors.push("Le mnémonique ne peut pas être vide");
		if (mnemonic.length > 32) errors.push("Le mnémonique doit faire moins de 32 caractères");
		if (!/^[a-zA-Z]/.test(mnemonic)) errors.push("Le mnémonique doit commencer par une lettre");
		if (!/^[a-zA-Z0-9_]+$/.test(mnemonic))
			errors.push("Le mnémonique ne peut contenir que des lettres, chiffres et underscores");
		return errors;
	}

	static validateZoneType(zone: VariableZone, type: VariableType): string[] {
		const errors = [];
		if (!ZoneToTypeMap[zone].includes(type))
			errors.push(`Le type ${type} n'est pas compatible avec la zone ${zone}`);
		return errors;
	}

	static validateAddress(address: string): string[] {
		const errors: string[] = [];
		if (address.length == 0) return errors; // Address is optional
		if (!/^%/.test(address)) errors.push("L'adresse doit commencer par le symbole %");
		const addressRegex = /^%(E|I|Q|O|EA|IW|SA|QW|M|MW|MF|MD|T)[0-9]{1,5}(\.[0-9]){0,5}$/;
		if (!address.match(addressRegex)) errors.push("L'adresse est invalide (Ex: %I0.0, %QW10, %MD100)");
		return errors;
	}

	static validate(variable: Variable): string[] {
		const errors: string[] = [];
		errors.push(...Variable.validateMnemonic(variable.mnemonic));
		errors.push(...Variable.validateZoneType(variable.zone, variable.type));
		if (variable.address && variable.address != "") {
			errors.push(...Variable.validateAddress(variable.address));
		}
		return errors;
	}
}
