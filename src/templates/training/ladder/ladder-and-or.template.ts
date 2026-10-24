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
export function createLadderAndOrProject(): Project {
	const project = new Project(
		createRandomId(),
		"Contacts en série et en parallèle",
		"",
	);
	project.variables.push(
		toggleSwitch("a"),
		toggleSwitch("b"),
		output("s_et"),
		output("s_ou"),
	);
	setMainSections(project, [
		section("Contacts en série", "", no("a"), no("b"), coil("s_et")),
		section(
			"Contacts en parallèle",
			"",
			or([no("a")], [no("b")]),
			coil("s_ou"),
		),
	]);
	return project;
}
