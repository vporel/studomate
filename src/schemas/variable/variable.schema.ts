export type VariableZone = "logic-input" | "logic-output" | "analog-input" | "analog-output" | "memory";
export type VariableDirection = "IN" | "OUT" | "INOUT";
export const VARIABLE_TYPES = [
	"BOOL",
	"INT",
	"LONG",
	"WORD",
	"DWORD",
	"REAL",
	"STRING",
	"TON",
	"TOFF",
	"TP",
] as const;

export type VariableType = (typeof VARIABLE_TYPES)[number];

export const ZONES_TO_TYPES: Record<VariableZone, VariableType[]> = {
	"logic-input": ["BOOL"],
	"logic-output": ["BOOL"],
	"analog-input": ["INT", "WORD", "DWORD"],
	"analog-output": ["INT", "WORD", "DWORD"],
	memory: ["BOOL", "INT", "LONG", "WORD", "DWORD", "REAL", "STRING"],
};

type NativeType = "number" | "boolean" | "string";

export const NATIVE_TYPE_LABELS: Record<NativeType, string> = {
	number: "nombre",
	boolean: "booléen",
	string: "chaîne de caractères",
};

export const VARIABLE_TYPE_TO_NATIVE_TYPE: Record<VariableType, NativeType> = {
	BOOL: "boolean",
	INT: "number",
	LONG: "number",
	WORD: "number",
	DWORD: "number",
	REAL: "number",
	STRING: "string",
	TON: "number",
	TOFF: "number",
	TP: "number",
};

export const VARIABLE_UPDATABLE_FIELDS = ["mnemonic", "zone", "type", "address", "comment"] as const;

export type VariableUpdatableFields = Pick<Variable, (typeof VARIABLE_UPDATABLE_FIELDS)[number]>;

export type VariableUpdatableFieldsWithId = VariableUpdatableFields & { id: string };
export default class Variable {
	id: string;
	mnemonic: string;
	zone: VariableZone;
	type: VariableType;
	address?: string;
	comment?: string;

	constructor(id: string, mnemonic: string, zone: VariableZone, type: VariableType) {
		this.id = id;
		this.mnemonic = mnemonic;
		this.zone = zone;
		this.type = type.toUpperCase() as VariableType;
		this.address = "";
		this.comment = "";

		const errors = Variable.validate(this);
		if (errors.length > 0) {
			throw new Error(errors.join(", "));
		}
	}

	getDirection(): VariableDirection {
		return this.zone.includes("input") ? "IN" : this.zone.includes("output") ? "OUT" : "INOUT";
	}

	getNativeType(): NativeType {
		return VARIABLE_TYPE_TO_NATIVE_TYPE[this.type];
	}

	update(updatedFields: Partial<VariableUpdatableFields>): Variable {
		if (updatedFields.type) updatedFields.type = updatedFields.type.trim().toUpperCase() as VariableType;
		if (updatedFields.address) updatedFields.address = updatedFields.address.trim().toUpperCase();
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
		return Object.assign(new Variable("id", "mnemonic", "memory", "BOOL"), this);
	}

	static createFromJSON(json: string): Variable {
		const jsonParsed = JSON.parse(json);
		return Object.assign(new Variable("id", "mnemonic", "memory", "BOOL"), jsonParsed);
	}

	static getValidTypesForZones(zones: VariableZone[]): VariableType[] {
		const validTypes: VariableType[] = [];
		zones.forEach((zone) => {
			validTypes.push(...ZONES_TO_TYPES[zone]);
		});
		return [...new Set(validTypes)];
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

	static validateType(type: string, zones: VariableZone[] = []): string[] {
		const errors: string[] = [];
		if (!VARIABLE_TYPES.includes(type as VariableType)) errors.push(`Le type ${type} n'est pas reconnu`);
		const validTypesForZones = Variable.getValidTypesForZones(zones);
		if (zones.length > 0 && !validTypesForZones.includes(type as VariableType))
			errors.push(
				`Le type ${type} n'est pas autorisé dans ce conexte. Utilisez les types suivants: ${[...new Set(validTypesForZones)].join(", ")}`,
			);
		return errors;
	}

	static validateZoneType(zone: VariableZone, type: VariableType): string[] {
		const errors: string[] = [];
		if (!ZONES_TO_TYPES[zone].includes(type))
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
