import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	callProgram,
	coil,
	counter,
	nf,
	no,
	or,
	section,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import {
	input,
	output,
	pushButton,
} from "@/templates/training/utils/training-variables";

export const SUBPROGRAMS_PRESET = 3;
export const COUNTING_PROGRAM_NAME = "Comptage";

/**
 * The Main runs the conveyor; the "Comptage" subprogram (a `CTU` and its lamp) exists but no
 * block calls it.
 */
export function createLadderSubprogramsProject(): Project {
	const project = new Project(createRandomId(), "Sous-programmes", "");
	project.variables.push(
		pushButton("marche"),
		pushButton("arret"),
		input("capteur_piece"),
		pushButton("raz"),
		output("convoyeur"),
		output("voyant_lot"),
	);
	const counting = project.createLadder(COUNTING_PROGRAM_NAME);
	counting.sections = [
		section(
			"Comptage des pièces",
			"Le CTU compte les fronts montants de capteur_piece, remise à zéro par raz.",
			no("capteur_piece"),
			counter("CTU", "cpt", {
				control: "raz",
				pv: `${SUBPROGRAMS_PRESET}`,
			}),
		),
		section(
			"Voyant de lot",
			"Allumé quand le lot est complet.",
			no("cpt.Q"),
			coil("voyant_lot"),
		),
	];
	setMainSections(project, [
		section(
			"Marche du convoyeur",
			"Auto-maintien à arrêt prioritaire.",
			or([no("marche")], [no("convoyeur")]),
			nf("arret"),
			coil("convoyeur"),
		),
	]);
	return project;
}

/** The Main calls "Comptage" unconditionally. */
export function createLadderSubprogramsSolution(): Project {
	const project = createLadderSubprogramsProject();
	project.name = "Sous-programmes : solution";
	const counting = Object.values(project.ladders).find(
		(ladder) => ladder.name === COUNTING_PROGRAM_NAME,
	)!;
	project.main.sections.push(
		section(
			"Appel du comptage",
			"Appel sans condition : le sous-programme s'exécute à chaque cycle.",
			callProgram(counting.id),
		),
	);
	return project;
}
