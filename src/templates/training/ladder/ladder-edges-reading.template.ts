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
import { output, pushButton } from "@/templates/training/utils/training-variables";

/** Same input on a NO, a `P` and a `N` contact, each latching its own output. No solution. */
export function createLadderEdgesReadingProject(): Project {
	const project = new Project(createRandomId(), "Lire les fronts", "");
	project.variables.push(
		pushButton("bp"),
		pushButton("raz"),
		output("s_no"),
		output("s_p"),
		output("s_n"),
	);
	setMainSections(project, [
		section("Contact NO", "s_no se mémorise tant que bp est vrai.", no("bp"), setCoil("s_no")),
		section("Contact P", "s_p se mémorise au cycle où bp passe à vrai.", rising("bp"), setCoil("s_p")),
		section("Contact N", "s_n se mémorise au cycle où bp repasse à faux.", falling("bp"), setCoil("s_n")),
		section(
			"Remise à zéro",
			"Un appui sur raz remet les trois sorties à faux.",
			no("raz"),
			or([resetCoil("s_no")], [resetCoil("s_p")], [resetCoil("s_n")]),
		),
	]);
	return project;
}
