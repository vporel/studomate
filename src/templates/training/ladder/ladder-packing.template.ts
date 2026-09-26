import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	callProgramsFromMain,
	coil,
	counter,
	falling,
	nf,
	no,
	or,
	resetCoil,
	section,
	setCoil,
	timer,
} from "@/templates/training/utils/ladder-dsl";
import {
	input,
	memory,
	output,
	pushButton,
	stopButton,
} from "@/templates/training/utils/training-variables";

export const PACKING_PRESET = 5;

/** Specification only: the student builds and declares the whole variable table. */
export function createLadderPackingProject(): Project {
	return new Project(createRandomId(), "Mise en caisse", "");
}

/**
 * Main calling three programs unconditionally: fault and start, counting, box change. The fault
 * lamp blinks while the fault is not acknowledged, stays on once acknowledged but still present,
 * and goes out when the fault has disappeared.
 */
export function createLadderPackingSolution(): Project {
	const project = new Project(createRandomId(), "Mise en caisse : solution", "");
	project.variables.push(
		pushButton("marche"),
		pushButton("arret"),
		stopButton("thermique"),
		pushButton("acquit"),
		input("capteur_piece"),
		output("convoyeur"),
		output("voyant_defaut"),
		memory("marche_mem"),
		memory("defaut_mem"),
		memory("raz_comptage"),
	);

	const faultAndStart = project.createLadder("Défaut et marche");
	faultAndStart.sections = [
		section("Mémoire de défaut", "Le relais thermique est câblé à ouverture : son déclenchement est un front descendant.", falling("thermique"), setCoil("defaut_mem")),
		section("Acquittement", "L'acquittement efface le clignotement, même si le défaut est encore présent.", no("acquit"), resetCoil("defaut_mem")),
		section(
			"Voyant de défaut",
			"Clignotant tant que le défaut n'est pas acquitté, fixe s'il est acquitté mais présent. Une base de temps système est un signal carré, directement utilisable pour clignoter.",
			or([no("defaut_mem"), no("_SYS_TB_500ms")], [nf("thermique"), nf("defaut_mem")]),
			coil("voyant_defaut"),
		),
		section(
			"Marche",
			"Auto-maintien à arrêt prioritaire : un défaut l'annule, il faut un nouvel appui sur Marche.",
			or([no("marche")], [no("marche_mem")]),
			nf("arret"),
			no("thermique"),
			coil("marche_mem"),
		),
		section("Convoyeur", "Arrêt à la présélection du compteur de pièces.", no("marche_mem"), nf("cpt_pieces.Q"), coil("convoyeur")),
	];

	const counting = project.createLadder("Comptage");
	counting.sections = [
		section(
			"Comptage des pièces",
			"Le CTU compte sur front du capteur.",
			no("capteur_piece"),
			counter("CTU", "cpt_pieces", { control: "raz_comptage", pv: `${PACKING_PRESET}` }),
		),
	];

	const boxChange = project.createLadder("Changement de caisse");
	boxChange.sections = [
		section("Temps de changement", "Le TON mesure le changement de caisse.", no("cpt_pieces.Q"), timer("TON", "t_caisse", "T#5s")),
		section("Remise à zéro", "Redémarrage automatique : le compteur repart de zéro.", no("t_caisse.Q"), coil("raz_comptage")),
	];

	callProgramsFromMain(project, [faultAndStart, counting, boxChange]);
	return project;
}

