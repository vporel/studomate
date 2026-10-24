import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	arithmetic,
	assign,
	convert,
	rising,
	section,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import {
	createTankControlSections,
	createTankVariables,
} from "./ladder-tank.template";
import {
	analogInput,
	memory,
} from "@/templates/training/utils/training-variables";

export const RAW_MAX = 27648;

function createScalingVariables(project: Project): void {
	createTankVariables(project, false);
	project.variables.push(
		analogInput("brut", 0, RAW_MAX),
		memory("calcul_int", "INT"),
		memory("calcul_dint", "DINT"),
		memory("calcul_real", "REAL"),
	);
}

function createCountSection(locale: Locale) {
	const t = createTemplateText("ladder-scaling", locale);
	return section(
		t("startCountTitle"),
		t("startCountDescription"),
		rising("pompe"),
		arithmetic("nb_demarrages", "nb_demarrages", "+", "1"),
	);
}

/** The Main holds the tank solution; `niveau` is now computed from `brut`, not an input. */
export function createLadderScalingProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-scaling", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
	createScalingVariables(project);
	setMainSections(project, [
		...createTankControlSections(locale),
		createCountSection(locale),
	]);
	return project;
}

/** Scaling in a `REAL` intermediate, then narrowing with `REAL_TO_INT`. */
export function createLadderScalingSolution(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-scaling", locale);
	const project = new Project(createRandomId(), t("solutionName"), "");
	createScalingVariables(project);
	setMainSections(project, [
		section(
			t("copyTitle"),
			t("copyDescription"),
			assign("calcul_real", "brut"),
		),
		section(
			t("multiplyTitle"),
			t("multiplyDescription"),
			arithmetic("calcul_real", "calcul_real", "*", "100"),
		),
		section(
			t("divideTitle"),
			t("divideDescription"),
			arithmetic("calcul_real", "calcul_real", "/", `${RAW_MAX}`),
		),
		section(
			t("backToIntTitle"),
			t("backToIntDescription"),
			convert("niveau", "calcul_real", "REAL", "INT"),
		),
		...createTankControlSections(locale),
		createCountSection(locale),
	]);
	return project;
}
