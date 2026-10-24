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
} from "@/templates/training/utils/ladder-dsl";
import {
	output,
	pushButton,
} from "@/templates/training/utils/training-variables";

export function createLadderInterlockProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-interlock", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
	project.variables.push(
		pushButton("avant"),
		pushButton("arriere"),
		pushButton("arret"),
		output("moteur_av"),
		output("moteur_ar"),
	);
	return project;
}

export function createLadderInterlockSolution(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-interlock", locale);
	const project = createLadderInterlockProject(locale);
	project.name = t("solutionName");
	setMainSections(project, [
		section(
			t("forwardTitle"),
			t("forwardDescription"),
			or([no("avant")], [no("moteur_av")]),
			nf("arret"),
			nf("moteur_ar"),
			coil("moteur_av"),
		),
		section(
			t("backwardTitle"),
			t("backwardDescription"),
			or([no("arriere")], [no("moteur_ar")]),
			nf("arret"),
			nf("moteur_av"),
			coil("moteur_ar"),
		),
	]);
	return project;
}
