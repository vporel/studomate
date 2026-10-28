import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	coil,
	no,
	section,
	setMainSections,
	timer,
} from "@/templates/training/utils/ladder-dsl";
import {
	output,
	pushButton,
} from "@/templates/training/utils/training-variables";

/** The same input drives a `TON`, a `TOF` and a `TP`. No solution to write. */
export function createLadderTimersReadingProject(
	locale: Locale = "fr",
): Project {
	const t = createTemplateText("ladder-timers-reading", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
	project.variables.push(
		pushButton("bp"),
		output("q_ton"),
		output("q_tof"),
		output("q_tp"),
	);
	setMainSections(project, [
		section(
			"TON",
			t("tonDescription"),
			no("bp"),
			timer("TON", "t_ton", "T#2s"),
			coil("q_ton"),
		),
		section(
			"TOF",
			t("tofDescription"),
			no("bp"),
			timer("TOF", "t_tof", "T#2s"),
			coil("q_tof"),
		),
		section(
			"TP",
			t("tpDescription"),
			no("bp"),
			timer("TP", "t_tp", "T#2s"),
			coil("q_tp"),
		),
	]);
	return project;
}
