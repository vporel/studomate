import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
import Project from "@/schemas/project/project.schema";
import Section from "@/schemas/ladder/section.schema";
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

export function createLadderSelfHoldingProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-self-holding", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
	project.variables.push(
		pushButton("marche"),
		pushButton("arret"),
		output("pompe"),
	);
	return project;
}

/** Self-holding pump command with stop priority. */
export function createPumpSelfHoldingSection(locale: Locale = "fr"): Section {
	const t = createTemplateText("ladder-self-holding", locale);
	return section(
		t("pumpSectionTitle"),
		t("pumpSectionDescription"),
		or([no("marche")], [no("pompe")]),
		nf("arret"),
		coil("pompe"),
	);
}

export function createLadderSelfHoldingSolution(
	locale: Locale = "fr",
): Project {
	const t = createTemplateText("ladder-self-holding", locale);
	const project = createLadderSelfHoldingProject(locale);
	project.name = t("solutionName");
	setMainSections(project, [createPumpSelfHoldingSection(locale)]);
	return project;
}
