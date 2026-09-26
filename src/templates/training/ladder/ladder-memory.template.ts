import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	coil,
	nf,
	no,
	or,
	resetCoil,
	section,
	setCoil,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import { createPumpSelfHoldingSection } from "./ladder-self-holding.template";
import { output, pushButton, toggleSwitchNc } from "@/templates/training/utils/training-variables";

function createFaultVariables(project: Project): void {
	project.variables.push(
		pushButton("marche"),
		pushButton("arret"),
		output("pompe"),
		toggleSwitchNc("temperature_ok"),
		pushButton("acquit"),
		output("voyant_defaut"),
	);
}

/** The Main holds the solution of the self-holding exercise. */
export function createLadderMemoryProject(): Project {
	const project = new Project(createRandomId(), "Pompe : défaut mémorisé", "");
	createFaultVariables(project);
	setMainSections(project, [createPumpSelfHoldingSection()]);
	return project;
}

export function createLadderMemorySolution(): Project {
	const project = new Project(
		createRandomId(),
		"Pompe : défaut mémorisé : solution",
		"",
	);
	createFaultVariables(project);
	setMainSections(project, [
		section(
			"Mémorisation du défaut",
			"Le capteur de température est câblé à ouverture : un contact NF détecte la surchauffe.",
			nf("temperature_ok"),
			setCoil("voyant_defaut"),
		),
		section(
			"Acquittement",
			"L'acquittement n'a d'effet que si le défaut a disparu.",
			no("acquit"),
			no("temperature_ok"),
			resetCoil("voyant_defaut"),
		),
		section(
			"Commande de la pompe",
			"La pompe est bloquée tant que le défaut est mémorisé et ne repart qu'avec un nouvel appui sur Marche.",
			or([no("marche")], [no("pompe")]),
			nf("arret"),
			no("temperature_ok"),
			nf("voyant_defaut"),
			coil("pompe"),
		),
	]);
	return project;
}
