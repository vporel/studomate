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
export function createLadderEdgesReadingProject(): Project {
	const project = new Project(createRandomId(), "Lire les fronts", "");
	project.variables.push(
		toggleSwitch("commut"),
		pushButton("raz"),
		output("s_no"),
		output("s_p"),
		output("s_n"),
	);
	setMainSections(project, [
		section(
			"Réseau 1",
			"Relevez cycle par cycle l'état de s_no pendant que commut passe de 0 à 1 puis revient à 0.",
			no("commut"),
			setCoil("s_no"),
		),
		section(
			"Réseau 2",
			"Relevez cycle par cycle l'état de s_p pendant que commut passe de 0 à 1 puis revient à 0.",
			rising("commut"),
			setCoil("s_p"),
		),
		section(
			"Réseau 3",
			"Relevez cycle par cycle l'état de s_n pendant que commut passe de 0 à 1 puis revient à 0.",
			falling("commut"),
			setCoil("s_n"),
		),
		section(
			"Remise à zéro",
			"Un appui sur raz remet les trois sorties à faux.",
			no("raz"),
			or([resetCoil("s_no")], [resetCoil("s_p")], [resetCoil("s_n")]),
		),
	]);
	return project;
}
