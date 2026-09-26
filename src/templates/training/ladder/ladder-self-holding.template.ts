import Project from "@/schemas/project/project.schema";
import Section from "@/schemas/ladder/section.schema";
import { createRandomId } from "@/ids";
import { coil, nf, no, or, section, setMainSections } from "@/templates/training/utils/ladder-dsl";
import { output, pushButton } from "@/templates/training/utils/training-variables";

export function createLadderSelfHoldingProject(): Project {
	const project = new Project(createRandomId(), "Pompe : auto-maintien", "");
	project.variables.push(pushButton("marche"), pushButton("arret"), output("pompe"));
	return project;
}

/** Self-holding pump command with stop priority. */
export function createPumpSelfHoldingSection(): Section {
	return section(
		"Commande de la pompe",
		"Auto-maintien à arrêt prioritaire : l'arrêt est en série, après le parallèle.",
		or([no("marche")], [no("pompe")]),
		nf("arret"),
		coil("pompe"),
	);
}

export function createLadderSelfHoldingSolution(): Project {
	const project = createLadderSelfHoldingProject();
	project.name = "Pompe : auto-maintien : solution";
	setMainSections(project, [createPumpSelfHoldingSection()]);
	return project;
}
