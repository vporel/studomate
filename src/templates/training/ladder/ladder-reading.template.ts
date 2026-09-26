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
import { output, toggleSwitch } from "@/templates/training/utils/training-variables";

/**
 * "Reading a Ladder program" project: a Main of combinational sections is provided, the student
 * predicts the outputs and checks in simulation. No solution to write.
 */
export function createLadderReadingProject(): Project {
	const project = new Project(createRandomId(), "Lire un programme Ladder", "");
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
		section("Série", "s1 est vraie quand a ET b sont vraies.", no("a"), no("b"), coil("s1")),
		section("Parallèle", "s2 est vraie quand a OU b est vraie.", or([no("a")], [no("b")]), coil("s2")),
		section("Contact à ouverture", "s3 est vraie quand a est vraie ET b est fausse.", no("a"), nf("b"), coil("s3")),
		section(
			"Combinaison",
			"s4 est vraie quand (a OU b) est vraie ET c est fausse.",
			or([no("a")], [no("b")]),
			nf("c"),
			coil("s4"),
		),
	]);
	return project;
}
