import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	coil,
	nf,
	no,
	or,
	section,
	setMainSections,
	timer,
} from "@/templates/training/utils/ladder-dsl";
import {
	output,
	pushButton,
	toggleSwitch,
} from "@/templates/training/utils/training-variables";

export function createLadderTimersProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-timers", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
	project.variables.push(
		pushButton("marche"),
		pushButton("arret"),
		output("km_ligne"),
		output("km_etoile"),
		output("km_triangle"),
		output("ventilateur"),
		toggleSwitch("inter_clignotant"),
		output("voyant"),
	);
	return project;
}

/**
 * Star-delta start (line + star, then delta after a `TON`), cooling fan held by a `TOF`, and a
 * blinker made of two crossed `TON`s.
 */
export function createLadderTimersSolution(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-timers", locale);
	const project = createLadderTimersProject(locale);
	project.name = t("solutionName");
	const starTimer = t("starTimerName");
	const fanTimer = t("fanTimerName");
	const lowPhaseTimer = t("lowPhaseTimerName");
	const highPhaseTimer = t("highPhaseTimerName");
	setMainSections(project, [
		section(
			t("lineContactorTitle"),
			t("lineContactorDescription"),
			or([no("marche")], [no("km_ligne")]),
			nf("arret"),
			coil("km_ligne"),
		),
		section(
			t("startTimeTitle"),
			t("startTimeDescription"),
			no("km_ligne"),
			timer("TON", starTimer, "T#5s"),
		),
		section(
			t("starTitle"),
			t("starDescription"),
			no("km_ligne"),
			nf(`${starTimer}.Q`),
			nf("km_triangle"),
			coil("km_etoile"),
		),
		section(
			t("deltaTitle"),
			t("deltaDescription"),
			no("km_ligne"),
			no(`${starTimer}.Q`),
			nf("km_etoile"),
			coil("km_triangle"),
		),
		section(
			t("fanTitle"),
			t("fanDescription"),
			no("km_ligne"),
			timer("TOF", fanTimer, "T#10s"),
			coil("ventilateur"),
		),
		section(
			t("blinkOffTitle"),
			t("blinkOffDescription"),
			no("inter_clignotant"),
			nf(`${highPhaseTimer}.Q`),
			timer("TON", lowPhaseTimer, "T#1s"),
		),
		section(
			t("blinkOnTitle"),
			t("blinkOnDescription"),
			no(`${lowPhaseTimer}.Q`),
			timer("TON", highPhaseTimer, "T#1s"),
		),
		section(
			t("indicatorTitle"),
			t("indicatorDescription"),
			no(`${lowPhaseTimer}.Q`),
			coil("voyant"),
		),
	]);
	return project;
}
