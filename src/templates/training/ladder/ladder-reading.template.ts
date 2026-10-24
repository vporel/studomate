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
		section(
			"Réseau 1",
			"Prédisez s1 pour chaque combinaison de a et b.",
			no("a"),
			no("b"),
			coil("s1"),
		),
		section(
			"Réseau 2",
			"Prédisez s2 pour chaque combinaison de a et b.",
			or([no("a")], [no("b")]),
			coil("s2"),
		),
		section(
			"Réseau 3",
			"Prédisez s3 pour chaque combinaison de a et b.",
			no("a"),
			nf("b"),
			coil("s3"),
		),
		section(
			"Réseau 4",
			"Prédisez s4 pour chaque combinaison de a, b et c.",
			or([no("a")], [no("b")]),
			nf("c"),
			coil("s4"),
		),
	]);
	return project;
}
