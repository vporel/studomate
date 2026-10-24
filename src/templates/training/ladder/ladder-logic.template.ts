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
	toggleSwitch,
} from "@/templates/training/utils/training-variables";

export function createLadderLogicProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-logic", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
	project.variables.push(
		toggleSwitch("inter1"),
		toggleSwitch("inter2"),
		toggleSwitch("validation"),
		output("lampe"),
	);
	return project;
}

/** `lampe = (inter1·/inter2 + /inter1·inter2)·validation` */
export function createLadderLogicSolution(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-logic", locale);
	const project = createLadderLogicProject(locale);
	project.name = t("solutionName");
	setMainSections(project, [
		section(
			t("lightingTitle"),
			t("lightingDescription"),
			or([no("inter1"), nf("inter2")], [nf("inter1"), no("inter2")]),
			no("validation"),
			coil("lampe"),
		),
	]);
	return project;
}
