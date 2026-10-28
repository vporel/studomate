import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
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
export function createLadderPackingProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-packing", locale);
	return new Project(createRandomId(), t("projectName"), "");
}

/**
 * Main calling three programs unconditionally: fault and start, counting, box change. The fault
 * lamp blinks while the fault is not acknowledged, stays on once acknowledged but still present,
 * and goes out when the fault has disappeared.
 */
export function createLadderPackingSolution(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-packing", locale);
	const piecesCounter = t("piecesCounter");
	const boxTimer = t("boxTimer");
	const project = new Project(createRandomId(), t("solutionName"), "");
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

	const faultAndStart = project.createLadder(t("faultAndStartProgram"));
	faultAndStart.sections = [
		section(
			t("faultMemoryTitle"),
			t("faultMemoryDescription"),
			falling("thermique"),
			setCoil("defaut_mem"),
		),
		section(
			t("ackTitle"),
			t("ackDescription"),
			no("acquit"),
			resetCoil("defaut_mem"),
		),
		section(
			t("faultLampTitle"),
			t("faultLampDescription"),
			or(
				[no("defaut_mem"), no("_SYS_TB_500ms")],
				[nf("thermique"), nf("defaut_mem")],
			),
			coil("voyant_defaut"),
		),
		section(
			t("startTitle"),
			t("startDescription"),
			or([no("marche")], [no("marche_mem")]),
			nf("arret"),
			no("thermique"),
			coil("marche_mem"),
		),
		section(
			t("conveyorTitle"),
			t("conveyorDescription"),
			no("marche_mem"),
			nf(`${piecesCounter}.Q`),
			coil("convoyeur"),
		),
	];

	const counting = project.createLadder(t("countingProgram"));
	counting.sections = [
		section(
			t("countingTitle"),
			t("countingDescription"),
			no("capteur_piece"),
			counter("CTU", piecesCounter, {
				control: "raz_comptage",
				pv: `${PACKING_PRESET}`,
			}),
		),
	];

	const boxChange = project.createLadder(t("boxChangeProgram"));
	boxChange.sections = [
		section(
			t("changeTimeTitle"),
			t("changeTimeDescription"),
			no(`${piecesCounter}.Q`),
			timer("TON", boxTimer, "T#5s"),
		),
		section(
			t("resetTitle"),
			t("resetDescription"),
			no(`${boxTimer}.Q`),
			coil("raz_comptage"),
		),
	];

	callProgramsFromMain(project, [faultAndStart, counting, boxChange]);
	return project;
}
