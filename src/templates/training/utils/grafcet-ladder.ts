import type { Locale } from "@/i18n/config";
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
import createTemplateText from "@/templates/template-text";
import { memory } from "@/templates/training/utils/training-variables";

const grafcetLadderText = (locale: Locale) =>
	createTemplateText("grafcet-ladder", locale);

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
		...[
			...spec.steps,
			...spec.transitions.map((transition) => transition.name),
		].map((name) => memory(name)),
		grafcetInitMemory(spec),
	];
}

export function grafcetInitMemory(spec: GrafcetLadderSpec): Variable {
	return memory(spec.initMemory ?? DEFAULT_INIT_MEMORY);
}

/** Initial-step activation followed by the crossing conditions of all transitions. */
export function grafcetConditionSections(
	spec: GrafcetLadderSpec,
	locale: Locale = "fr",
): Section[] {
	const t = grafcetLadderText(locale);
	const initMemory = spec.initMemory ?? DEFAULT_INIT_MEMORY;
	return [
		section(
			t("initialStepTitle"),
			t("initialStepDescription"),
			nf(initMemory),
			...inParallel(spec.initial.map((step) => setCoil(step))),
		),
		section(
			t("initLatchTitle"),
			t("initLatchDescription"),
			nf(initMemory),
			setCoil(initMemory),
		),
		...spec.transitions.map((transition) =>
			section(
				t("crossingTitle", { name: transition.name }),
				t("crossingDescription"),
				...transition.from.map((step) => no(step)),
				...transition.receptivity,
				coil(transition.name),
			),
		),
	];
}

/** All the resets of all transitions, then all the sets, so that an activation wins over a deactivation. */
export function grafcetEvolutionSections(
	spec: GrafcetLadderSpec,
	locale: Locale = "fr",
): Section[] {
	const t = grafcetLadderText(locale);
	return [
		...spec.transitions.map((transition) =>
			section(
				t("deactivationTitle", { name: transition.name }),
				t("deactivationDescription"),
				no(transition.name),
				...inParallel(transition.from.map((step) => resetCoil(step))),
			),
		),
		...spec.transitions.map((transition) =>
			section(
				t("activationTitle", { name: transition.name }),
				t("activationDescription"),
				no(transition.name),
				...inParallel(transition.to.map((step) => setCoil(step))),
			),
		),
	];
}

/** Clears every step, then reactivates the initial steps, with priority over the normal evolution. */
export function grafcetResetSections(
	spec: GrafcetLadderSpec,
	locale: Locale = "fr",
): Section[] {
	if (!spec.resetCondition) return [];
	const t = grafcetLadderText(locale);
	return [
		section(
			t("resetDeactivationTitle"),
			t("resetDeactivationDescription"),
			...spec.resetCondition,
			...inParallel(spec.steps.map((step) => resetCoil(step))),
		),
		section(
			t("resetInitialTitle"),
			t("resetInitialDescription"),
			...spec.resetCondition,
			...inParallel(spec.initial.map((step) => setCoil(step))),
		),
	];
}

/** Continuous action: the output is true while any of its steps is active. */
export function grafcetOutputSection(
	output: string,
	steps: string[],
	locale: Locale = "fr",
): Section {
	const t = grafcetLadderText(locale);
	return section(
		t("outputTitle", { output }),
		t("outputDescription"),
		...inParallel(steps.map((step) => no(step))),
		coil(output),
	);
}

/** The method's three blocks in order: conditions, evolution (then reset), outputs. */
export function grafcetSections(
	spec: GrafcetLadderSpec,
	outputs: { variable: string; steps: string[] }[] = [],
	locale: Locale = "fr",
): Section[] {
	return [
		...grafcetConditionSections(spec, locale),
		...grafcetEvolutionSections(spec, locale),
		...grafcetResetSections(spec, locale),
		...outputs.map(({ variable, steps }) =>
			grafcetOutputSection(variable, steps, locale),
		),
	];
}
