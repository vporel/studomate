import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
import Project from "@/schemas/project/project.schema";
import Section from "@/schemas/ladder/section.schema";
import { createRandomId } from "@/ids";
import {
	arithmetic,
	coil,
	compare,
	no,
	resetCoil,
	rising,
	section,
	setCoil,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import {
	analogInput,
	memory,
	output,
} from "@/templates/training/utils/training-variables";

export const LEVEL_LOW = 20;
export const LEVEL_HIGH = 80;
export const LEVEL_ALARM = 95;

export function createTankVariables(
	project: Project,
	levelIsInput: boolean,
): void {
	project.variables.push(
		levelIsInput ? analogInput("niveau", 0, 100) : memory("niveau", "INT"),
		output("pompe"),
		output("alarme"),
		memory("nb_demarrages", "INT"),
	);
}

/** Pump hysteresis (compare + memory) and high-level alarm. */
export function createTankControlSections(locale: Locale = "fr"): Section[] {
	const t = createTemplateText("ladder-tank", locale);
	return [
		section(
			t("pumpStartTitle"),
			t("pumpStartDescription"),
			compare("niveau", "<", `${LEVEL_LOW}`),
			setCoil("pompe"),
		),
		section(
			t("pumpStopTitle"),
			t("pumpStopDescription"),
			compare("niveau", ">", `${LEVEL_HIGH}`),
			resetCoil("pompe"),
		),
		section(
			t("alarmTitle"),
			t("alarmDescription"),
			compare("niveau", ">", `${LEVEL_ALARM}`),
			coil("alarme"),
		),
	];
}

/** The Main increments a counter under a NO contact: it counts on every scan. */
export function createLadderTankProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-tank", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
	createTankVariables(project, true);
	setMainSections(project, [
		section(
			t("startCountTitle"),
			t("startCountDescription"),
			no("pompe"),
			arithmetic("nb_demarrages", "nb_demarrages", "+", "1"),
		),
	]);
	return project;
}

export function createLadderTankSolution(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-tank", locale);
	const project = new Project(createRandomId(), t("solutionName"), "");
	createTankVariables(project, true);
	setMainSections(project, [
		...createTankControlSections(locale),
		section(
			t("startCountTitle"),
			t("solutionStartCountDescription"),
			rising("pompe"),
			arithmetic("nb_demarrages", "nb_demarrages", "+", "1"),
		),
	]);
	return project;
}
