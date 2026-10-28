import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import { CAPACITE, createParkingVariables } from "@/templates/parking.template";
import {
	arithmetic,
	callProgram,
	coil,
	compare,
	nf,
	no,
	or,
	rising,
	section,
} from "@/templates/training/utils/ladder-dsl";
import {
	GrafcetLadderSpec,
	addGrafcetPrograms,
	grafcetMemories,
	grafcetProgramSections,
	grafcetSections,
} from "@/templates/training/utils/grafcet-ladder";
import { stopButton } from "@/templates/training/utils/training-variables";

/**
 * Command: E0 ─dem_entree ET places < CAPACITE→ E1 (barrière, places+1) ─passage→ E2 (barrière) ─NON passage→ E0
 *          E0 ─dem_sortie ET places > 0→ E3 (barrière, places-1) ─passage→ E4 (barrière) ─NON passage→ E0
 */
export const PARKING_COMMAND_SPEC: GrafcetLadderSpec = {
	steps: ["X0", "X1", "X2", "X3", "X4"],
	initial: ["X0"],
	transitions: [
		{
			from: ["X0"],
			to: ["X1"],
			receptivity: [no("dem_entree"), compare("places", "<", `${CAPACITE}`)],
		},
		{
			from: ["X0"],
			to: ["X3"],
			receptivity: [no("dem_sortie"), compare("places", ">", "0")],
		},
		{ from: ["X1"], to: ["X2"], receptivity: [no("passage")] },
		{ from: ["X3"], to: ["X4"], receptivity: [no("passage")] },
		{ from: ["X2"], to: ["X0"], receptivity: [nf("passage")] },
		{ from: ["X4"], to: ["X0"], receptivity: [nf("passage")] },
	],
	resetCondition: [nf("arret")],
};

/** Signalisation: S0 ─places >= CAPACITE→ S1 (complet) ─places < CAPACITE→ S0. */
export const PARKING_SIGNALLING_SPEC: GrafcetLadderSpec = {
	steps: ["S0", "S1"],
	initial: ["S0"],
	transitions: [
		{
			from: ["S0"],
			to: ["S1"],
			receptivity: [compare("places", ">=", `${CAPACITE}`)],
		},
		{
			from: ["S1"],
			to: ["S0"],
			receptivity: [compare("places", "<", `${CAPACITE}`)],
		},
	],
};

/** Parking variables (without HMI), stop button, command memories; signalling already in Ladder. */
function createBase(name: string, locale: Locale): Project {
	const t = createTemplateText("parking-ladder", locale);
	const project = new Project(createRandomId(), name, "");
	project.variables.push(
		...createParkingVariables(locale),
		stopButton("arret"),
		...grafcetMemories(PARKING_COMMAND_SPEC),
		...grafcetMemories(PARKING_SIGNALLING_SPEC),
	);
	const signalling = project.createLadder(t("signallingProgramName"));
	signalling.sections = grafcetSections(
		PARKING_SIGNALLING_SPEC,
		[{ variable: "complet", steps: ["S1"] }],
		locale,
	);
	project.main.sections = [
		section(
			t("signallingTitle"),
			t("signallingDescription"),
			callProgram(signalling.id),
		),
	];
	return project;
}

export function createParkingLadderProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("parking-ladder", locale);
	return createBase(t("projectName"), locale);
}

export function createParkingLadderSolution(locale: Locale = "fr"): Project {
	const t = createTemplateText("parking-ladder", locale);
	const project = createBase(t("solutionName"), locale);
	const command = grafcetProgramSections(PARKING_COMMAND_SPEC, [], locale);
	addGrafcetPrograms(
		project,
		{
			cycle: command.cycle,
			outputs: [
				section(
					t("barrierTitle"),
					t("barrierDescription"),
					or([no("X1")], [no("X2")], [no("X3")], [no("X4")], [no("passage")]),
					coil("barriere"),
				),
				section(
					t("vehicleEntryTitle"),
					t("vehicleEntryDescription"),
					rising("X1"),
					arithmetic("places", "places", "+", "1"),
				),
				section(
					t("vehicleExitTitle"),
					t("vehicleExitDescription"),
					rising("X3"),
					arithmetic("places", "places", "-", "1"),
				),
			],
		},
		locale,
	);
	return project;
}
