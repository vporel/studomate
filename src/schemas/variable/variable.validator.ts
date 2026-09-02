/**
 * Validation d'une variable — **produit des codes d'erreur, jamais de texte d'affichage** (le
 * domaine ne rend pas). Le rendu localisé se fait côté UI (`useT("variableValidation")` dans
 * `useDataGridColums` et `useBlockNameField`).
 *
 * Vit à côté de `variable.schema.ts`, qui garde le vocabulaire du domaine (`VariableZone`,
 * `VARIABLE_TYPES`, `ZONES_TO_TYPES`…) : ce module l'importe et n'y ajoute que les règles.
 * `variable.schema.ts` importe en retour `validateVariable` (appelé uniquement dans le
 * constructeur / `update`) — aucun des deux modules n'utilise l'autre à l'évaluation.
 */
import {
	getValidTypesForZones,
	VARIABLE_TYPES,
	ZONES_TO_TYPES,
	type VariableType,
	type VariableZone,
} from "./variable.schema";

/** Longueur maximale d'un mnémonique de variable (= nom d'un bloc système, même espace de noms). */
export const MNEMONIC_MAX_LENGTH = 32;

export type VariableValidationCode =
	| "MNEMONIC_EMPTY"
	| "MNEMONIC_TOO_LONG"
	| "MNEMONIC_MUST_START_WITH_LETTER"
	| "MNEMONIC_INVALID_CHARS"
	| "MNEMONIC_BLOCK_FORMAT"
	| "TYPE_UNKNOWN"
	| "TYPE_NOT_ALLOWED_IN_ZONE"
	| "ZONE_TYPE_INCOMPATIBLE"
	| "ADDRESS_MISSING_PERCENT"
	| "ADDRESS_INVALID";

export type VariableValidationIssue = {
	code: VariableValidationCode;
	params?: Record<string, string | number>;
};

const issue = (
	code: VariableValidationCode,
	params?: Record<string, string | number>,
): VariableValidationIssue => ({ code, params });

/**
 * `hasOwnerBlock` autorise un unique point (ex. `Tempo1.PT`) : réservé aux variables générées
 * pour un bloc système (voir `Variable.ownerBlock`), jamais à un mnémonique saisi par
 * l'utilisateur.
 */
export function validateMnemonic(
	mnemonic: string,
	hasOwnerBlock = false,
): VariableValidationIssue[] {
	const issues: VariableValidationIssue[] = [];
	if (mnemonic.length === 0) issues.push(issue("MNEMONIC_EMPTY"));
	if (mnemonic.length > MNEMONIC_MAX_LENGTH)
		issues.push(issue("MNEMONIC_TOO_LONG", { max: MNEMONIC_MAX_LENGTH }));
	if (!/^[a-zA-Z]/.test(mnemonic))
		issues.push(issue("MNEMONIC_MUST_START_WITH_LETTER"));
	const allowedPattern = hasOwnerBlock
		? /^[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+$/
		: /^[a-zA-Z0-9_]+$/;
	if (!allowedPattern.test(mnemonic))
		issues.push(
			issue(hasOwnerBlock ? "MNEMONIC_BLOCK_FORMAT" : "MNEMONIC_INVALID_CHARS"),
		);
	return issues;
}

export function validateVariableType(
	type: string,
	zones: VariableZone[] = [],
): VariableValidationIssue[] {
	const issues: VariableValidationIssue[] = [];
	if (!VARIABLE_TYPES.includes(type as VariableType))
		issues.push(issue("TYPE_UNKNOWN", { type }));
	const allowed = getValidTypesForZones(zones);
	if (zones.length > 0 && !allowed.includes(type as VariableType))
		issues.push(
			issue("TYPE_NOT_ALLOWED_IN_ZONE", { type, allowed: allowed.join(", ") }),
		);
	return issues;
}

export function validateZoneType(
	zone: VariableZone,
	type: VariableType,
): VariableValidationIssue[] {
	if (ZONES_TO_TYPES[zone].includes(type)) return [];
	return [issue("ZONE_TYPE_INCOMPATIBLE", { type, zone })];
}

export function validateAddress(address: string): VariableValidationIssue[] {
	if (address.length === 0) return []; // adresse optionnelle
	const issues: VariableValidationIssue[] = [];
	if (!address.startsWith("%")) issues.push(issue("ADDRESS_MISSING_PERCENT"));
	const addressRegex =
		/^%(E|I|Q|O|EA|IW|SA|QW|M|MW|MF|MD)[0-9]{1,5}(\.[0-9]){0,5}$/;
	if (!addressRegex.test(address)) issues.push(issue("ADDRESS_INVALID"));
	return issues;
}

/** Forme minimale requise pour valider une variable complète (évite d'importer la classe). */
export type ValidatableVariable = {
	mnemonic: string;
	zone: VariableZone;
	type: VariableType;
	address?: string;
	ownerBlock?: unknown;
};

/** Validation composite d'une variable : mnémonique + compatibilité zone/type + adresse. */
export function validateVariable(
	variable: ValidatableVariable,
): VariableValidationIssue[] {
	return [
		...validateMnemonic(variable.mnemonic, variable.ownerBlock !== undefined),
		...validateZoneType(variable.zone, variable.type),
		...(variable.address ? validateAddress(variable.address) : []),
	];
}
