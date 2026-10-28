import { Dialect } from "@/expression-language/dialect.enum";
import { NumericRange } from "@/lib/numeric-range";
import type { InputBehavior } from "./input-behavior";
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
	| "memory"
	| "constant";
/** Zones whose variables cannot be written: a constant is fixed at design time. */
export const READ_ONLY_ZONES: readonly VariableZone[] = ["constant"];
export type VariableDirection = "IN" | "OUT" | "INOUT";

export const VARIABLE_TYPES = [
	"BOOL",
	"INT",
	"DINT",
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
	memory: ["BOOL", "INT", "DINT", "WORD", "DWORD", "REAL", "STRING", "TIME"],
	constant: ["BOOL", "INT", "DINT", "WORD", "DWORD", "REAL", "STRING", "TIME"],
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
	DINT: "number",
	WORD: "number",
	DWORD: "number",
	REAL: "number",
	STRING: "string",
	TIME: "number",
};

/**
 * Domaine de valeurs à faire respecter en simulation, par type. `null` = aucune contrainte :
 * REAL est un flottant libre ; TIME est un compteur de millisecondes piloté par les
 * temporisations, le borner casserait leur accumulation. Les entiers replient comme sur un
 * automate.
 */
const VARIABLE_TYPE_TO_NUMERIC_RANGE: Record<
	VariableType,
	NumericRange | null
> = {
	BOOL: null,
	STRING: null,
	REAL: null,
	TIME: null,
	INT: { min: -32768, max: 32767, integer: true, wrap: true },
	DINT: { min: -2147483648, max: 2147483647, integer: true, wrap: true },
	WORD: { min: 0, max: 65535, integer: true, wrap: true },
	DWORD: { min: 0, max: 4294967295, integer: true, wrap: true },
};

export function getNumericRange(type: VariableType): NumericRange | null {
	return VARIABLE_TYPE_TO_NUMERIC_RANGE[type];
}

export const VARIABLE_UPDATABLE_FIELDS = [
	"mnemonic",
	"zone",
	"type",
	"address",
	"comment",
	"behavior",
	"value",
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

export interface VariableInit {
	id: string;
	mnemonic: string;
	zone: VariableZone;
	type: VariableType;
	ownerBlock?: VariableOwnerBlock;
	value?: string;
	dialect: Dialect;
}

export default class Variable {
	id: string;
	mnemonic: string;
	zone: VariableZone;
	type: VariableType;
	address?: string;
	comment?: string;
	/** Absent on projects saved before this field existed: same meaning as `null`. */
	behavior?: InputBehavior | null;
	/** Literal fixed at design time, required for the `"constant"` zone (form expected by
	 * `parseConstantLiteral`: `T#5s`, `123`, the boolean keyword of the project dialect, `"text"`). */
	value?: string;
	ownerBlock?: VariableOwnerBlock;

	constructor(init: VariableInit) {
		const { id, mnemonic, zone, type, ownerBlock, value, dialect } = init;
		this.id = id;
		this.mnemonic = mnemonic;
		this.zone = zone;
		this.type = type.toUpperCase() as VariableType;
		this.address = "";
		this.comment = "";
		this.behavior = null;
		this.ownerBlock = ownerBlock;
		if (value !== undefined) this.value = value;

		const issues = validateVariable(this, dialect);
		if (issues.length > 0) {
			throw new Error(
				`Invalid variable: ${issues.map((i) => i.code).join(", ")}`,
			);
		}
	}

	static fromData(
		data: VariableUpdatableFieldsWithId,
		dialect: Dialect,
	): Variable {
		const variable = new Variable({
			id: data.id,
			mnemonic: data.mnemonic,
			zone: data.zone,
			type: data.type,
			value: data.value,
			dialect,
		});
		if (data.address) variable.address = data.address;
		if (data.comment) variable.comment = data.comment;
		return data.behavior
			? variable.update({ behavior: data.behavior }, dialect)
			: variable;
	}

	getDirection(): VariableDirection {
		return this.zone.includes("input")
			? "IN"
			: this.zone.includes("output")
				? "OUT"
				: "INOUT";
	}

	isReadOnly(): boolean {
		return READ_ONLY_ZONES.includes(this.zone);
	}

	getNativeType(): NativeType {
		return VARIABLE_TYPE_TO_NATIVE_TYPE[this.type];
	}

	getNumericRange(): NumericRange | null {
		return getNumericRange(this.type);
	}

	/** Retourne une nouvelle instance avec les champs appliqués, sans muter `this` : les variables
	 * sont traitées comme immuables pour que `Project.copy()` puisse réutiliser les instances
	 * inchangées par référence. */
	update(
		updatedFields: Partial<VariableUpdatableFields>,
		dialect: Dialect,
	): Variable {
		if (updatedFields.type)
			updatedFields.type = updatedFields.type
				.trim()
				.toUpperCase() as VariableType;
		if (updatedFields.address)
			updatedFields.address = updatedFields.address.trim().toUpperCase();
		const updatedVariable = this.copy();
		Object.assign(updatedVariable, updatedFields);
		const issues = validateVariable(updatedVariable, dialect);
		if (issues.length > 0) {
			throw new Error(
				`Invalid variable update: ${issues.map((i) => i.code).join(", ")}`,
			);
		}
		return updatedVariable;
	}

	/** Valid stand-in whose fields are overwritten right after by `Object.assign`. */
	private static placeholder(): Variable {
		return new Variable({
			id: "id",
			mnemonic: "mnemonic",
			zone: "memory",
			type: "BOOL",
			dialect: Dialect.FR,
		});
	}

	copy(): Variable {
		return Object.assign(Variable.placeholder(), this);
	}

	static createFromJSON(json: string): Variable {
		const jsonParsed = JSON.parse(json);
		return Object.assign(Variable.placeholder(), jsonParsed);
	}
}
