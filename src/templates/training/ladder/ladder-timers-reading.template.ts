import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	coil,
	no,
	section,
	setMainSections,
	timer,
} from "@/templates/training/utils/ladder-dsl";
import { output, pushButton } from "@/templates/training/utils/training-variables";

/** The same input drives a `TON`, a `TOF` and a `TP`. No solution to write. */
export function createLadderTimersReadingProject(): Project {
	const project = new Project(createRandomId(), "Lire les temporisations", "");
	project.variables.push(
		pushButton("bp"),
		output("q_ton"),
		output("q_tof"),
		output("q_tp"),
	);
	setMainSections(project, [
		section("TON", "Retard à l'enclenchement de 2 s.", no("bp"), timer("TON", "t_ton", "T#2s"), coil("q_ton")),
		section("TOF", "Retard au déclenchement de 2 s.", no("bp"), timer("TOF", "t_tof", "T#2s"), coil("q_tof")),
		section("TP", "Impulsion de 2 s, non redéclenchable.", no("bp"), timer("TP", "t_tp", "T#2s"), coil("q_tp")),
	]);
	return project;
}
