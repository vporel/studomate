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
	section,
	setCoil,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import { createPumpSelfHoldingSection } from "./ladder-self-holding.template";
import {
	output,
	pushButton,
	toggleSwitchNc,
} from "@/templates/training/utils/training-variables";

function createFaultVariables(project: Project): void {
	project.variables.push(
		pushButton("marche"),
		pushButton("arret"),
		output("pompe"),
		toggleSwitchNc("temperature_ok"),
		pushButton("acquit"),
		output("voyant_defaut"),
	);
}

/** The Main holds the solution of the self-holding exercise. */
export function createLadderMemoryProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-memory", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
	createFaultVariables(project);
	setMainSections(project, [createPumpSelfHoldingSection(locale)]);
	return project;
}

export function createLadderMemorySolution(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-memory", locale);
	const project = new Project(createRandomId(), t("solutionName"), "");
	createFaultVariables(project);
	setMainSections(project, [
		section(
			t("faultMemoryTitle"),
			t("faultMemoryDescription"),
			nf("temperature_ok"),
			setCoil("voyant_defaut"),
		),
		section(
			t("ackTitle"),
			t("ackDescription"),
			no("acquit"),
			no("temperature_ok"),
			resetCoil("voyant_defaut"),
		),
		section(
			t("pumpTitle"),
			t("pumpDescription"),
			or([no("marche")], [no("pompe")]),
			nf("arret"),
			no("temperature_ok"),
			nf("voyant_defaut"),
			coil("pompe"),
		),
	]);
	return project;
}
