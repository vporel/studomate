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

/** Every memory a spec needs: the step memories and the start-up memory. */
export function grafcetMemories(spec: GrafcetLadderSpec): Variable[] {
	return [...spec.steps.map((name) => memory(name)), grafcetInitMemory(spec)];
}

export function grafcetInitMemory(spec: GrafcetLadderSpec): Variable {
	return memory(spec.initMemory ?? DEFAULT_INIT_MEMORY);
}

/** Initial-step activation and its latch. */
export function grafcetInitSections(
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
	];
}

/**
 * One network per transition, in the order of the spec: the upstream steps in series, then the
 * receptivity, then in parallel the resets of the upstream steps and the sets of the downstream
 * steps. A transition reads the step memories as the previous networks left them.
 */
export function grafcetTransitionSections(
	spec: GrafcetLadderSpec,
	locale: Locale = "fr",
): Section[] {
	const t = grafcetLadderText(locale);
	return spec.transitions.map((transition) =>
		section(
			`${transition.from.join(" + ")} -> ${transition.to.join(" + ")}`,
			t("transitionDescription"),
			...transition.from.map((step) => no(step)),
			...transition.receptivity,
			...inParallel([
				...transition.from.map((step) => resetCoil(step)),
				...transition.to.map((step) => setCoil(step)),
			]),
		),
	);
}

/** Name of the memory holding the crossing condition of the transition at `index` (`Tn = Xn ET Rn`). */
export const grafcetCrossingMemoryName = (index: number) => `T${index}`;

/** Every memory the three-block method needs: steps, one crossing memory per transition and the start-up memory. */
export function grafcetThreeBlockMemories(spec: GrafcetLadderSpec): Variable[] {
	return [
		...[
			...spec.steps,
			...spec.transitions.map((_, index) => grafcetCrossingMemoryName(index)),
		].map((name) => memory(name)),
		grafcetInitMemory(spec),
	];
}

/**
 * The three-block method: every crossing condition first, then all the resets of all the
 * transitions, then all the sets, so that each transition reads the state of the start of the
 * scan and an activation wins over a deactivation.
 */
export function grafcetThreeBlockSections(
	spec: GrafcetLadderSpec,
	outputs: { variable: string; steps: string[] }[] = [],
	locale: Locale = "fr",
): Section[] {
	const t = grafcetLadderText(locale);
	const crossing = (index: number) => grafcetCrossingMemoryName(index);
	return [
		...grafcetInitSections(spec, locale),
		...spec.transitions.map((transition, index) =>
			section(
				t("crossingTitle", { name: crossing(index) }),
				t("crossingDescription"),
				...transition.from.map((step) => no(step)),
				...transition.receptivity,
				coil(crossing(index)),
			),
		),
		...spec.transitions.map((transition, index) =>
			section(
				t("deactivationTitle", { name: crossing(index) }),
				t("deactivationDescription"),
				no(crossing(index)),
				...inParallel(transition.from.map((step) => resetCoil(step))),
			),
		),
		...spec.transitions.map((transition, index) =>
			section(
				t("activationTitle", { name: crossing(index) }),
				t("activationDescription"),
				no(crossing(index)),
				...inParallel(transition.to.map((step) => setCoil(step))),
			),
		),
		...grafcetResetSections(spec, locale),
		...outputs.map(({ variable, steps }) =>
			grafcetOutputSection(variable, steps, locale),
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

/** The method's blocks in order: start-up, one network per transition, reset, outputs. */
export function grafcetSections(
	spec: GrafcetLadderSpec,
	outputs: { variable: string; steps: string[] }[] = [],
	locale: Locale = "fr",
): Section[] {
	return [
		...grafcetInitSections(spec, locale),
		...grafcetTransitionSections(spec, locale),
		...grafcetResetSections(spec, locale),
		...outputs.map(({ variable, steps }) =>
			grafcetOutputSection(variable, steps, locale),
		),
	];
}
