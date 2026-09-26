import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	coil,
	nf,
	no,
	or,
	resetCoil,
	rising,
	section,
	setCoil,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import { memory, output, pushButton } from "@/templates/training/utils/training-variables";

function createToggleVariables(project: Project): void {
	project.variables.push(pushButton("bp"), output("lampe"), memory("imp"));
}

/** The Main holds the naive two-section solution, on which the lamp never lights. */
export function createLadderToggleProject(): Project {
	const project = new Project(createRandomId(), "Télérupteur", "");
	createToggleVariables(project);
	setMainSections(project, [
		section("Allumer", "Front de bp et lampe éteinte : allumer.", rising("bp"), nf("lampe"), setCoil("lampe")),
		section("Éteindre", "Front de bp et lampe allumée : éteindre.", rising("bp"), no("lampe"), resetCoil("lampe")),
	]);
	return project;
}

/** `imp` memorises the pulse of a single `P` contact: `lampe = imp·/lampe + /imp·lampe`. */
export function createLadderToggleSolution(): Project {
	const project = new Project(createRandomId(), "Télérupteur : solution", "");
	createToggleVariables(project);
	setMainSections(project, [
		section("Impulsion", "Un seul contact P mémorise le front dans imp.", rising("bp"), coil("imp")),
		section(
			"Bascule",
			"La lampe change d'état à chaque impulsion.",
			or([no("imp"), nf("lampe")], [nf("imp"), no("lampe")]),
			coil("lampe"),
		),
	]);
	return project;
}
