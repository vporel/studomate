import type { Locale } from "@/i18n/config";
import type Project from "@/schemas/project/project.schema";
import Section from "@/schemas/ladder/section.schema";
import Variable from "@/schemas/variable/variable.schema";
import {
	LadderItem,
	callProgram,
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
	/** Condition that re-initializes the GRAFCET (all steps cleared, initial steps reactivated). */
	resetCondition?: LadderItem[];
};

const inParallel = (items: LadderItem[]): LadderItem[] =>
	items.length === 1 ? items : [or(...items.map((item) => [item]))];

/** Every memory a spec needs: one per step. */
export function grafcetMemories(spec: GrafcetLadderSpec): Variable[] {
	return spec.steps.map((name) => memory(name));
}

/** Activates the initial steps when no step of the GRAFCET is active. */
export function grafcetInitSection(
	spec: GrafcetLadderSpec,
	locale: Locale = "fr",
): Section {
	const t = grafcetLadderText(locale);
	return section(
		t("initialStepTitle"),
		t("initialStepDescription"),
		...spec.steps.map((step) => nf(step)),
		...inParallel(spec.initial.map((step) => setCoil(step))),
	);
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

/** Every memory the three-block method needs: steps and one crossing memory per transition. */
export function grafcetThreeBlockMemories(spec: GrafcetLadderSpec): Variable[] {
	return [
		...spec.steps,
		...spec.transitions.map((_, index) => grafcetCrossingMemoryName(index)),
	].map((name) => memory(name));
}

/**
 * The three-block method split by program: the crossing conditions and the step changes belong to
 * the automatic cycle, the outputs to the outputs program. Every crossing condition comes first,
 * then all the resets of all the transitions, then all the sets, so that each transition reads
 * the state of the start of the scan and an activation wins over a deactivation.
 */
export function grafcetThreeBlockProgramSections(
	spec: GrafcetLadderSpec,
	outputs: { variable: string; steps: string[] }[] = [],
	locale: Locale = "fr",
): GrafcetProgramSections {
	const t = grafcetLadderText(locale);
	const crossing = (index: number) => grafcetCrossingMemoryName(index);
	return {
		cycle: [
			grafcetInitSection(spec, locale),
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
		],
		outputs: outputs.map(({ variable, steps }) =>
			grafcetOutputSection(variable, steps, locale),
		),
	};
}

/** The three-block method in a single program: the cycle sections, then the outputs. */
export function grafcetThreeBlockSections(
	spec: GrafcetLadderSpec,
	outputs: { variable: string; steps: string[] }[] = [],
	locale: Locale = "fr",
): Section[] {
	const programs = grafcetThreeBlockProgramSections(spec, outputs, locale);
	return [...programs.cycle, ...programs.outputs];
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

/** Sections of the two programs a GRAFCET is split into. */
export type GrafcetProgramSections = {
	/** Start-up, one network per transition, then the reset. */
	cycle: Section[];
	/** One network per output. */
	outputs: Section[];
};

export function grafcetProgramSections(
	spec: GrafcetLadderSpec,
	outputs: { variable: string; steps: string[] }[] = [],
	locale: Locale = "fr",
): GrafcetProgramSections {
	return {
		cycle: [
			grafcetInitSection(spec, locale),
			...grafcetTransitionSections(spec, locale),
			...grafcetResetSections(spec, locale),
		],
		outputs: outputs.map(({ variable, steps }) =>
			grafcetOutputSection(variable, steps, locale),
		),
	};
}

/** The method's blocks in order in a single program: start-up, one network per transition, reset, outputs. */
export function grafcetSections(
	spec: GrafcetLadderSpec,
	outputs: { variable: string; steps: string[] }[] = [],
	locale: Locale = "fr",
): Section[] {
	const programs = grafcetProgramSections(spec, outputs, locale);
	return [...programs.cycle, ...programs.outputs];
}

/**
 * Creates the programs of a GRAFCET implementation and makes the Main call them after its
 * existing sections (an empty default network is dropped), in this order: faults (when given), automatic cycle, outputs.
 */
export function addGrafcetPrograms(
	project: Project,
	programs: GrafcetProgramSections & { faults?: Section[] },
	locale: Locale = "fr",
): void {
	const t = grafcetLadderText(locale);
	project.main.sections = project.main.sections.filter(
		(existing) => !existing.isEmpty(),
	);
	const add = (kind: "faults" | "cycle" | "outputs", sections: Section[]) => {
		const ladder = project.createLadder(t(`${kind}ProgramName`));
		ladder.sections = sections;
		project.main.sections.push(
			section(ladder.name, t(`${kind}CallDescription`), callProgram(ladder.id)),
		);
	};
	if (programs.faults) add("faults", programs.faults);
	add("cycle", programs.cycle);
	add("outputs", programs.outputs);
}
