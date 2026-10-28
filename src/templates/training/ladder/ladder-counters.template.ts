import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
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

export function createLadderCountersProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-counters", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
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
export function createLadderCountersSolution(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-counters", locale);
	const project = createLadderCountersProject(locale);
	project.name = t("solutionName");
	const piecesCounter = t("piecesCounter");
	const bufferCounter = t("bufferCounter");
	const stockCounter = t("stockCounter");
	setMainSections(project, [
		section(
			t("piecesTitle"),
			t("piecesDescription"),
			no("capteur_piece"),
			counter("CTU", piecesCounter, { control: "raz", pv: `${PIECES_PRESET}` }),
		),
		section(
			t("conveyorTitle"),
			t("conveyorDescription"),
			nf(`${piecesCounter}.Q`),
			coil("convoyeur"),
		),
		section(
			t("bufferTitle"),
			t("bufferDescription"),
			no("capteur_entree"),
			counter("CTUD", bufferCounter, {
				control: "raz_tampon",
				down: "capteur_sortie",
				load: "charge_tampon",
				pv: `${BUFFER_CAPACITY}`,
			}),
		),
		section(
			t("bufferFullTitle"),
			t("bufferFullDescription"),
			no(`${bufferCounter}.QU`),
			coil("tampon_plein"),
		),
		section(
			t("bufferEmptyTitle"),
			t("bufferEmptyDescription"),
			no(`${bufferCounter}.QD`),
			coil("tampon_vide"),
		),
		section(
			t("stockTitle"),
			t("stockDescription"),
			no("capteur_prelevement"),
			counter("CTD", stockCounter, {
				control: "charge_stock",
				pv: `${STOCK_INITIAL}`,
			}),
		),
		section(
			t("stockEmptyTitle"),
			t("stockEmptyDescription"),
			no(`${stockCounter}.Q`),
			coil("stock_vide"),
		),
	]);
	return project;
}
