import { VariableType } from "./variable.schema";

/**
 * Préfixe réservé aux **variables système** : registres fournis par le moteur (bases de temps
 * aujourd'hui, d'autres catégories à terme). Un identifiant commençant par ce préfixe ne peut
 * pas être créé par l'utilisateur (validation) ni recevoir d'affectation (analyse sémantique) —
 * il est injecté au moment de l'analyse et de la compilation, jamais persisté.
 */
export const SYSTEM_VARIABLE_PREFIX = "_SYS_";

/** Toute variable système, quelle que soit sa catégorie. */
export type SystemVariable = {
	name: string;
	type: VariableType;
	/** Texte affiché à l'utilisateur (table des variables, autocomplétion, manuel). */
	description: string;
};

/**
 * Base de temps : `_SYS_TB_X` est un BOOL vrai pendant exactement un scan par période de temps
 * simulé, faux sinon (impulsion, pas un signal carré). Équivalent des *clock memory bits* des
 * automates réels. Contrainte assumée : `temps de scan ≤ période`.
 */
export type SystemTimeBase = SystemVariable & {
	type: "BOOL";
	periodMs: number;
};

/**
 * `_SYS_TB_100ms` est dégénérée au temps de scan par défaut (100 ms) — active à chaque scan —
 * mais utile à scan plus court ; `_SYS_TB_10ms` reste absente (inutilisable à cette échelle).
 */
export const SYSTEM_TIME_BASES: readonly SystemTimeBase[] = [
	{
		name: "_SYS_TB_100ms",
		type: "BOOL",
		periodMs: 100,
		description: "Base de temps : impulsion d'un scan toutes les 100 ms.",
	},
	{
		name: "_SYS_TB_200ms",
		type: "BOOL",
		periodMs: 200,
		description: "Base de temps : impulsion d'un scan toutes les 200 ms.",
	},
	{
		name: "_SYS_TB_500ms",
		type: "BOOL",
		periodMs: 500,
		description: "Base de temps : impulsion d'un scan toutes les 500 ms.",
	},
	{
		name: "_SYS_TB_1s",
		type: "BOOL",
		periodMs: 1000,
		description: "Base de temps : impulsion d'un scan toutes les 1 s.",
	},
	{
		name: "_SYS_TB_2s",
		type: "BOOL",
		periodMs: 2000,
		description: "Base de temps : impulsion d'un scan toutes les 2 s.",
	},
] as const;

/** Toutes les variables système exposées, toutes catégories confondues. */
export const SYSTEM_VARIABLES: readonly SystemVariable[] = [...SYSTEM_TIME_BASES];

export function isSystemVariableName(name: string): boolean {
	return name.startsWith(SYSTEM_VARIABLE_PREFIX);
}

export function getSystemVariable(name: string): SystemVariable | undefined {
	return SYSTEM_VARIABLES.find((variable) => variable.name === name);
}
