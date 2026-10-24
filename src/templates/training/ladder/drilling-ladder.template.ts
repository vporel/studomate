import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	addDrillingOperativePart,
	createDrillingVariables,
} from "@/templates/drilling.template";
import {
	no,
	resetCoil,
	section,
	setCoil,
	timer,
} from "@/templates/training/utils/ladder-dsl";
import {
	GrafcetLadderSpec,
	grafcetMemories,
	grafcetSections,
} from "@/templates/training/utils/grafcet-ladder";
import {
	memory,
	toggleSwitch,
} from "@/templates/training/utils/training-variables";

export const DESCENT_WATCHDOG_SECONDS = 8;

/**
 * E0 ─dcy→ E1 (descendre, broche) ─b→ E2 (broche, 2 s) ─drill timer→ E3 (monter, broche) ─h→ E0,
 * plus E1 ─watchdog timer (descent watchdog)→ E3.
 */
function createDrillingSpec(
	drillTimer: string,
	watchdogTimer: string,
): GrafcetLadderSpec {
	return {
		steps: ["X0", "X1", "X2", "X3"],
		initial: ["X0"],
		transitions: [
			{ from: ["X0"], to: ["X1"], receptivity: [no("dcy")] },
			{ from: ["X1"], to: ["X2"], receptivity: [no("b")] },
			{
				from: ["X2"],
				to: ["X3"],
				receptivity: [no(`${drillTimer}.Q`)],
			},
			{ from: ["X3"], to: ["X0"], receptivity: [no("h")] },
			{
				from: ["X1"],
				to: ["X3"],
				receptivity: [no(`${watchdogTimer}.Q`)],
			},
		],
	};
}

/** Drilling variables with the `blocage` switch, the operative part called by the Main, no control. */
function createBase(
	name: string,
	spec: GrafcetLadderSpec,
	locale: Locale,
): Project {
	const project = new Project(createRandomId(), name, "");
	project.variables.push(
		...createDrillingVariables(locale),
		toggleSwitch("blocage"),
		memory("defaut"),
		...grafcetMemories(spec),
	);
	addDrillingOperativePart(project, { blockable: true }, locale);
	return project;
}

export function createDrillingLadderProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("drilling-ladder", locale);
	const spec = createDrillingSpec(t("drillTimer"), t("watchdogTimer"));
	return createBase(t("projectName"), spec, locale);
}

export function createDrillingLadderSolution(locale: Locale = "fr"): Project {
	const t = createTemplateText("drilling-ladder", locale);
	const drillTimer = t("drillTimer");
	const watchdogTimer = t("watchdogTimer");
	const spec = createDrillingSpec(drillTimer, watchdogTimer);
	const project = createBase(t("solutionName"), spec, locale);
	const [callSection] = project.main.sections;
	project.main.sections = [
		callSection,
		section(
			t("drillTimerTitle"),
			t("drillTimerDescription"),
			no("X2"),
			timer("TON", drillTimer, "T#2s"),
		),
		section(
			t("watchdogTitle"),
			t("watchdogDescription", { seconds: DESCENT_WATCHDOG_SECONDS }),
			no("X1"),
			timer("TON", watchdogTimer, `T#${DESCENT_WATCHDOG_SECONDS}s`),
		),
		section(
			t("faultTitle"),
			t("faultDescription"),
			no(`${watchdogTimer}.Q`),
			setCoil("defaut"),
		),
		section(
			t("faultResetTitle"),
			t("faultResetDescription"),
			no("X0"),
			no("dcy"),
			resetCoil("defaut"),
		),
		...grafcetSections(
			spec,
			[
				{ variable: "descendre", steps: ["X1"] },
				{ variable: "broche", steps: ["X1", "X2", "X3"] },
				{ variable: "monter", steps: ["X3"] },
			],
			locale,
		),
	];
	return project;
}
