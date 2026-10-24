import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	falling,
	no,
	resetCoil,
	rising,
	or,
	section,
	setCoil,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import {
	output,
	pushButton,
	toggleSwitch,
} from "@/templates/training/utils/training-variables";

/** Same input on a NO, a `P` and a `N` contact, each latching its own output. No solution. */
export function createLadderEdgesReadingProject(
	locale: Locale = "fr",
): Project {
	const t = createTemplateText("ladder-edges-reading", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
	project.variables.push(
		toggleSwitch("commut"),
		pushButton("raz"),
		output("s_no"),
		output("s_p"),
		output("s_n"),
	);
	setMainSections(project, [
		section(
			t("network1Title"),
			t("network1Description"),
			no("commut"),
			setCoil("s_no"),
		),
		section(
			t("network2Title"),
			t("network2Description"),
			rising("commut"),
			setCoil("s_p"),
		),
		section(
			t("network3Title"),
			t("network3Description"),
			falling("commut"),
			setCoil("s_n"),
		),
		section(
			t("resetTitle"),
			t("resetDescription"),
			no("raz"),
			or([resetCoil("s_no")], [resetCoil("s_p")], [resetCoil("s_n")]),
		),
	]);
	return project;
}
