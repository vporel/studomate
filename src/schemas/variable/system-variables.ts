import { VariableType } from "./variable.schema";

/**
 * Préfixe réservé aux **variables système** : registres fournis par le moteur (bit de premier
 * scan, bases de temps). Un identifiant commençant par ce préfixe ne peut
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
 * Base de temps : `_SYS_TB_X` est un BOOL en signal carré (rapport cyclique 50 %) vrai pendant
 * la première moitié de chaque période de temps simulé, faux pendant la seconde. Équivalent des
 * *clock memory bits* des automates réels (%S de Schneider, clock memory bits de Siemens...), qui
 * sont eux aussi des niveaux et non des impulsions.
 *
 * Simplification assumée : `periodMs` d'une base de temps ne doit jamais être **inférieure au
 * temps de scan** (100 ms par défaut). Une base plus rapide que le scan (`_SYS_TB_50ms`,
 * `_SYS_TB_10ms`) est donc interdite : la demi-période deviendrait plus courte qu'un scan, et le
 * niveau haut ou bas risquerait de ne jamais être observé par le programme (`PLC.updateSystemTimeBases`).
 * Toutes les bases listées ici respectent cette borne au scan par défaut.
 */
export type SystemTimeBase = SystemVariable & {
	type: "BOOL";
	periodMs: number;
};

/**
 * `_SYS_TB_100ms` est dégénérée au temps de scan par défaut (100 ms) — sa demi-période (50 ms)
 * n'est pas résolue et son niveau peut sembler irrégulier — mais utile à scan plus court.
 */
export const SYSTEM_TIME_BASES: readonly SystemTimeBase[] = [
	{
		name: "_SYS_TB_100ms",
		type: "BOOL",
		periodMs: 100,
		description: "Base de temps : signal carré de période 100 ms.",
	},
	{
		name: "_SYS_TB_200ms",
		type: "BOOL",
		periodMs: 200,
		description: "Base de temps : signal carré de période 200 ms.",
	},
	{
		name: "_SYS_TB_500ms",
		type: "BOOL",
		periodMs: 500,
		description: "Base de temps : signal carré de période 500 ms.",
	},
	{
		name: "_SYS_TB_1s",
		type: "BOOL",
		periodMs: 1000,
		description: "Base de temps : signal carré de période 1 s.",
	},
	{
		name: "_SYS_TB_2s",
		type: "BOOL",
		periodMs: 2000,
		description: "Base de temps : signal carré de période 2 s.",
	},
] as const;

/** Vrai pendant le seul premier scan après le démarrage de la simulation (le cycle
 * d'établissement), faux ensuite. Pause, reprise et pas-à-pas ne le réarment pas. */
export const SYSTEM_FIRST_SCAN: SystemVariable = {
	name: "_SYS_FIRST_SCAN",
	type: "BOOL",
	description: "Vrai pendant le premier scan après le démarrage de la simulation.",
};

/** Toutes les variables système exposées, toutes catégories confondues. */
export const SYSTEM_VARIABLES: readonly SystemVariable[] = [
	SYSTEM_FIRST_SCAN,
	...SYSTEM_TIME_BASES,
];

export function isSystemVariableName(name: string): boolean {
	return name.startsWith(SYSTEM_VARIABLE_PREFIX);
}

export function getSystemVariable(name: string): SystemVariable | undefined {
	return SYSTEM_VARIABLES.find((variable) => variable.name === name);
}
