import { validateVariable } from "./variable.validator";

export type {
	VariableValidationCode,
	VariableValidationIssue,
} from "./variable.validator";

export type VariableZone =
	| "logic-input"
	| "logic-output"
	| "analog-input"
	| "analog-output"
	| "memory";
export type VariableDirection = "IN" | "OUT" | "INOUT";

export const VARIABLE_TYPES = [
	"BOOL",
	"INT",
	"LONG",
	"WORD",
	"DWORD",
	"REAL",
	"STRING",
	"TIME",
] as const;

export type VariableType = (typeof VARIABLE_TYPES)[number];

export const ZONES_TO_TYPES: Record<VariableZone, VariableType[]> = {
	"logic-input": ["BOOL"],
	"logic-output": ["BOOL"],
	"analog-input": ["INT", "WORD", "DWORD"],
	"analog-output": ["INT", "WORD", "DWORD"],
	memory: ["BOOL", "INT", "LONG", "WORD", "DWORD", "REAL", "STRING", "TIME"],
};

/** Types valides pour l'union de plusieurs zones, sans doublon. */
export function getValidTypesForZones(zones: VariableZone[]): VariableType[] {
	return [...new Set(zones.flatMap((zone) => ZONES_TO_TYPES[zone]))];
}

export type NativeType = "number" | "boolean" | "string";

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
	TIME: "number",
};

export const VARIABLE_UPDATABLE_FIELDS = [
	"mnemonic",
	"zone",
	"type",
	"address",
	"comment",
] as const;

export type VariableUpdatableFields = Pick<
	Variable,
	(typeof VARIABLE_UPDATABLE_FIELDS)[number]
>;

export type VariableUpdatableFieldsWithId = VariableUpdatableFields & {
	id: string;
};

/** Référence vers le bloc système (voir `Project.blocks`) propriétaire d'une variable générée
 * automatiquement (ex. `Tempo1.PT`) — absent pour une variable créée normalement par l'utilisateur. */
export type VariableOwnerBlock = { id: string };

export default class Variable {
	id: string;
	mnemonic: string;
	zone: VariableZone;
	type: VariableType;
	address?: string;
	comment?: string;
	ownerBlock?: VariableOwnerBlock;

	constructor(
		id: string,
		mnemonic: string,
		zone: VariableZone,
		type: VariableType,
		ownerBlock?: VariableOwnerBlock,
	) {
		this.id = id;
		this.mnemonic = mnemonic;
		this.zone = zone;
		this.type = type.toUpperCase() as VariableType;
		this.address = "";
		this.comment = "";
		this.ownerBlock = ownerBlock;

		const issues = validateVariable(this);
		if (issues.length > 0) {
			throw new Error(
				`Invalid variable: ${issues.map((i) => i.code).join(", ")}`,
			);
		}
	}

	getDirection(): VariableDirection {
		return this.zone.includes("input")
			? "IN"
			: this.zone.includes("output")
				? "OUT"
				: "INOUT";
	}

	getNativeType(): NativeType {
		return VARIABLE_TYPE_TO_NATIVE_TYPE[this.type];
	}

	/** Retourne une nouvelle instance avec les champs appliqués, sans muter `this` : les variables
	 * sont traitées comme immuables pour que `Project.copy()` puisse réutiliser les instances
	 * inchangées par référence. */
	update(updatedFields: Partial<VariableUpdatableFields>): Variable {
		if (updatedFields.type)
			updatedFields.type = updatedFields.type
				.trim()
				.toUpperCase() as VariableType;
		if (updatedFields.address)
			updatedFields.address = updatedFields.address.trim().toUpperCase();
		const updatedVariable = this.copy();
		Object.assign(updatedVariable, updatedFields);
		const issues = validateVariable(updatedVariable);
		if (issues.length > 0) {
			throw new Error(
				`Invalid variable update: ${issues.map((i) => i.code).join(", ")}`,
			);
		}
		return updatedVariable;
	}

	copy(): Variable {
		return Object.assign(
			new Variable("id", "mnemonic", "memory", "BOOL"),
			this,
		);
	}

	static createFromJSON(json: string): Variable {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new Variable("id", "mnemonic", "memory", "BOOL"),
			jsonParsed,
		);
	}
}
