import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import { coil, nf, no, or, section, setMainSections } from "@/templates/training/utils/ladder-dsl";
import { output, pushButton } from "@/templates/training/utils/training-variables";

export function createLadderInterlockProject(): Project {
	const project = new Project(createRandomId(), "Moteur deux sens", "");
	project.variables.push(
		pushButton("avant"),
		pushButton("arriere"),
		pushButton("arret"),
		output("moteur_av"),
		output("moteur_ar"),
	);
	return project;
}

export function createLadderInterlockSolution(): Project {
	const project = createLadderInterlockProject();
	project.name = "Moteur deux sens : solution";
	setMainSections(project, [
		section(
			"Marche avant",
			"Auto-maintien à arrêt prioritaire, verrouillé par la marche arrière.",
			or([no("avant")], [no("moteur_av")]),
			nf("arret"),
			nf("moteur_ar"),
			coil("moteur_av"),
		),
		section(
			"Marche arrière",
			"Auto-maintien à arrêt prioritaire, verrouillé par la marche avant.",
			or([no("arriere")], [no("moteur_ar")]),
			nf("arret"),
			nf("moteur_av"),
			coil("moteur_ar"),
		),
	]);
	return project;
}
