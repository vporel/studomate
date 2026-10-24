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

/**
 * "Reading a Ladder program" project: a Main of combinational sections is provided, the student
 * predicts the outputs and checks in simulation. No solution to write.
 */
export function createLadderReadingProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-reading", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
	project.variables.push(
		toggleSwitch("a"),
		toggleSwitch("b"),
		toggleSwitch("c"),
		output("s1"),
		output("s2"),
		output("s3"),
		output("s4"),
	);
	setMainSections(project, [
		section(
			t("network1Title"),
			t("network1Description"),
			no("a"),
			no("b"),
			coil("s1"),
		),
		section(
			t("network2Title"),
			t("network2Description"),
			or([no("a")], [no("b")]),
			coil("s2"),
		),
		section(
			t("network3Title"),
			t("network3Description"),
			no("a"),
			nf("b"),
			coil("s3"),
		),
		section(
			t("network4Title"),
			t("network4Description"),
			or([no("a")], [no("b")]),
			nf("c"),
			coil("s4"),
		),
	]);
	return project;
}
