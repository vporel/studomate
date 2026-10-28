import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	coil,
	nf,
	no,
	or,
	resetCoil,
	rising,
	section,
	setCoil,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import {
	memory,
	output,
	pushButton,
} from "@/templates/training/utils/training-variables";

function createToggleVariables(project: Project): void {
	project.variables.push(pushButton("bp"), output("lampe"), memory("imp"));
}

/** The Main holds the naive two-section solution, on which the lamp never lights. */
export function createLadderToggleProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-toggle", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
	createToggleVariables(project);
	setMainSections(project, [
		section(
			t("turnOnTitle"),
			t("turnOnDescription"),
			rising("bp"),
			nf("lampe"),
			setCoil("lampe"),
		),
		section(
			t("turnOffTitle"),
			t("turnOffDescription"),
			rising("bp"),
			no("lampe"),
			resetCoil("lampe"),
		),
	]);
	return project;
}

/** `imp` memorises the pulse of a single `P` contact: `lampe = imp·/lampe + /imp·lampe`. */
export function createLadderToggleSolution(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-toggle", locale);
	const project = new Project(createRandomId(), t("solutionName"), "");
	createToggleVariables(project);
	setMainSections(project, [
		section(t("pulseTitle"), t("pulseDescription"), rising("bp"), coil("imp")),
		section(
			t("toggleTitle"),
			t("toggleDescription"),
			or([no("imp"), nf("lampe")], [nf("imp"), no("lampe")]),
			coil("lampe"),
		),
	]);
	return project;
}
