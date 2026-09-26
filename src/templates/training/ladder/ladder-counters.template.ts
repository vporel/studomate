import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	coil,
	counter,
	nf,
	no,
	section,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import {
	input,
	output,
	pushButton,
} from "@/templates/training/utils/training-variables";

export const PIECES_PRESET = 5;
export const BUFFER_CAPACITY = 3;
export const STOCK_INITIAL = 4;

export function createLadderCountersProject(): Project {
	const project = new Project(createRandomId(), "Comptage", "");
	project.variables.push(
		input("capteur_piece"),
		pushButton("raz"),
		output("convoyeur"),
		input("capteur_entree"),
		input("capteur_sortie"),
		pushButton("raz_tampon"),
		pushButton("charge_tampon"),
		output("tampon_plein"),
		output("tampon_vide"),
		input("capteur_prelevement"),
		pushButton("charge_stock"),
		output("stock_vide"),
	);
	return project;
}

/** (a) `CTU` stops the conveyor, (b) `CTUD` buffer, extension: `CTD` stock loaded by `LD`. */
export function createLadderCountersSolution(): Project {
	const project = createLadderCountersProject();
	project.name = "Comptage : solution";
	setMainSections(project, [
		section(
			"Comptage des pièces",
			"Le CTU compte sur front montant du capteur, remise à zéro par raz.",
			no("capteur_piece"),
			counter("CTU", "cpt_pieces", { control: "raz", pv: `${PIECES_PRESET}` }),
		),
		section("Convoyeur", "Arrêt à la présélection.", nf("cpt_pieces.Q"), coil("convoyeur")),
		section(
			"Zone tampon",
			"Le capteur d'entrée compte, le capteur de sortie décompte.",
			no("capteur_entree"),
			counter("CTUD", "tampon", {
				control: "raz_tampon",
				down: "capteur_sortie",
				load: "charge_tampon",
				pv: `${BUFFER_CAPACITY}`,
			}),
		),
		section("Tampon plein", "QU vaut CV >= PV.", no("tampon.QU"), coil("tampon_plein")),
		section("Tampon vide", "QD vaut CV <= 0.", no("tampon.QD"), coil("tampon_vide")),
		section(
			"Stock de pièces",
			"Le CTD est chargé à PV par LD et décompte à chaque pièce prélevée.",
			no("capteur_prelevement"),
			counter("CTD", "stock", { control: "charge_stock", pv: `${STOCK_INITIAL}` }),
		),
		section("Stock vide", "Q vaut CV <= 0.", no("stock.Q"), coil("stock_vide")),
	]);
	return project;
}
