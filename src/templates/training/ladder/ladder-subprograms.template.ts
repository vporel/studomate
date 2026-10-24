import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
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
export function createLadderSubprogramsProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-subprograms", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
	project.variables.push(
		pushButton("marche"),
		pushButton("arret"),
		input("capteur_piece"),
		pushButton("raz"),
		output("convoyeur"),
		output("voyant_lot"),
	);
	const counting = project.createLadder(t("countingProgramName"));
	counting.sections = [
		section(
			t("countPartsTitle"),
			t("countPartsDescription"),
			no("capteur_piece"),
			counter("CTU", "cpt", {
				control: "raz",
				pv: `${SUBPROGRAMS_PRESET}`,
			}),
		),
		section(
			t("batchIndicatorTitle"),
			t("batchIndicatorDescription"),
			no("cpt.Q"),
			coil("voyant_lot"),
		),
	];
	setMainSections(project, [
		section(
			t("conveyorRunTitle"),
			t("conveyorRunDescription"),
			or([no("marche")], [no("convoyeur")]),
			nf("arret"),
			coil("convoyeur"),
		),
	]);
	return project;
}

/** The Main calls "Comptage" unconditionally. */
export function createLadderSubprogramsSolution(
	locale: Locale = "fr",
): Project {
	const t = createTemplateText("ladder-subprograms", locale);
	const project = createLadderSubprogramsProject(locale);
	project.name = t("solutionName");
	const counting = Object.values(project.ladders).find(
		(ladder) => ladder.name === t("countingProgramName"),
	)!;
	project.main.sections.push(
		section(
			t("callCountingTitle"),
			t("callCountingDescription"),
			callProgram(counting.id),
		),
	);
	return project;
}
