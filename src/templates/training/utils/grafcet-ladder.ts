import Section from "@/schemas/ladder/section.schema";
import Variable from "@/schemas/variable/variable.schema";
import {
	LadderItem,
	coil,
	nf,
	no,
	or,
	resetCoil,
	section,
	setCoil,
} from "@/templates/training/utils/ladder-dsl";
import { memory } from "@/templates/training/utils/training-variables";

export type GrafcetTransitionSpec = {
	/** Name of the memory holding the crossing condition (`Tn = Xn ET Rn`). */
	name: string;
	from: string[];
	to: string[];
	/** Receptivity as series items, appended after the upstream step contacts. */
	receptivity: LadderItem[];
};

export type GrafcetLadderSpec = {
	/** Step memories, in order. */
	steps: string[];
	initial: string[];
	transitions: GrafcetTransitionSpec[];
	/** Memory that is false at start-up, activates the initial steps once, then latches. */
	initMemory?: string;
	/** Condition that re-initializes the GRAFCET (all steps cleared, initial steps reactivated). */
	resetCondition?: LadderItem[];
};

const DEFAULT_INIT_MEMORY = "init";

const inParallel = (items: LadderItem[]): LadderItem[] =>
	items.length === 1 ? items : [or(...items.map((item) => [item]))];

/** Every memory a spec needs: steps, crossing conditions and the start-up memory. */
export function grafcetMemories(spec: GrafcetLadderSpec): Variable[] {
	return [
		...spec.steps,
		...spec.transitions.map((transition) => transition.name),
		spec.initMemory ?? DEFAULT_INIT_MEMORY,
	].map((name) => memory(name));
}

/** Initial-step activation followed by the crossing conditions of all transitions. */
export function grafcetConditionSections(spec: GrafcetLadderSpec): Section[] {
	const initMemory = spec.initMemory ?? DEFAULT_INIT_MEMORY;
	return [
		section(
			"Activation de l'étape initiale",
			"Au premier cycle, la mémoire d'initialisation est fausse : les étapes initiales s'activent.",
			nf(initMemory),
			...inParallel(spec.initial.map((step) => setCoil(step))),
		),
		section(
			"Verrouillage de l'initialisation",
			"La mémoire d'initialisation se verrouille : l'activation n'a lieu qu'une fois.",
			nf(initMemory),
			setCoil(initMemory),
		),
		...spec.transitions.map((transition) =>
			section(
				`Condition de franchissement ${transition.name}`,
				"Toutes les conditions sont calculées avant toute évolution (règle 4).",
				...transition.from.map((step) => no(step)),
				...transition.receptivity,
				coil(transition.name),
			),
		),
	];
}

/** All the resets of all transitions, then all the sets, so that an activation wins over a deactivation. */
export function grafcetEvolutionSections(spec: GrafcetLadderSpec): Section[] {
	return [
		...spec.transitions.map((transition) =>
			section(
				`Désactivation par ${transition.name}`,
				"Les étapes amont de la transition franchie se désactivent.",
				no(transition.name),
				...inParallel(transition.from.map((step) => resetCoil(step))),
			),
		),
		...spec.transitions.map((transition) =>
			section(
				`Activation par ${transition.name}`,
				"Les étapes aval de la transition franchie s'activent : l'activation l'emporte (règle 5).",
				no(transition.name),
				...inParallel(transition.to.map((step) => setCoil(step))),
			),
		),
	];
}

/** Clears every step, then reactivates the initial steps, with priority over the normal evolution. */
export function grafcetResetSections(spec: GrafcetLadderSpec): Section[] {
	if (!spec.resetCondition) return [];
	return [
		section(
			"Réinitialisation : désactivation",
			"Toutes les étapes sont désactivées.",
			...spec.resetCondition,
			...inParallel(spec.steps.map((step) => resetCoil(step))),
		),
		section(
			"Réinitialisation : étape initiale",
			"Les étapes initiales sont réactivées.",
			...spec.resetCondition,
			...inParallel(spec.initial.map((step) => setCoil(step))),
		),
	];
}

/** Continuous action: the output is true while any of its steps is active. */
export function grafcetOutputSection(
	output: string,
	steps: string[],
): Section {
	return section(
		`Sortie ${output}`,
		"Action continue : vraie tant qu'une des étapes qui la commandent est active.",
		...inParallel(steps.map((step) => no(step))),
		coil(output),
	);
}

/** The method's three blocks in order: conditions, evolution (then reset), outputs. */
export function grafcetSections(
	spec: GrafcetLadderSpec,
	outputs: { variable: string; steps: string[] }[] = [],
): Section[] {
	return [
		...grafcetConditionSections(spec),
		...grafcetEvolutionSections(spec),
		...grafcetResetSections(spec),
		...outputs.map(({ variable, steps }) =>
			grafcetOutputSection(variable, steps),
		),
	];
}
