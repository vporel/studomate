import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import { coil, nf, no, or, section, setMainSections } from "@/templates/training/utils/ladder-dsl";
import { output, toggleSwitch } from "@/templates/training/utils/training-variables";

export function createLadderLogicProject(): Project {
	const project = new Project(createRandomId(), "Éclairage en va-et-vient", "");
	project.variables.push(
		toggleSwitch("inter1"),
		toggleSwitch("inter2"),
		toggleSwitch("validation"),
		output("lampe"),
	);
	return project;
}

/** `lampe = (inter1·/inter2 + /inter1·inter2)·validation` */
export function createLadderLogicSolution(): Project {
	const project = createLadderLogicProject();
	project.name = "Éclairage en va-et-vient : solution";
	setMainSections(project, [
		section(
			"Éclairage",
			"La lampe s'allume quand exactement un des deux interrupteurs est actionné, si la validation est active.",
			or([no("inter1"), nf("inter2")], [nf("inter1"), no("inter2")]),
			no("validation"),
			coil("lampe"),
		),
	]);
	return project;
}
