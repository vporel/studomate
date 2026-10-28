import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	coil,
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
 * "AND / OR observation" project: two provided networks (series and parallel contacts) that the
 * student exercises in simulation to see the truth table at work. No solution to write.
 */
export function createLadderAndOrProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-and-or", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
	project.variables.push(
		toggleSwitch("a"),
		toggleSwitch("b"),
		output("s_et"),
		output("s_ou"),
	);
	setMainSections(project, [
		section(t("seriesTitle"), "", no("a"), no("b"), coil("s_et")),
		section(t("parallelTitle"), "", or([no("a")], [no("b")]), coil("s_ou")),
	]);
	return project;
}
