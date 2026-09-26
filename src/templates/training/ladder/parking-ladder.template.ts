import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import { CAPACITE, createParkingVariables } from "@/templates/parking.template";
import {
	arithmetic,
	callProgram,
	compare,
	nf,
	no,
	rising,
	section,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import {
	GrafcetLadderSpec,
	grafcetMemories,
	grafcetSections,
} from "@/templates/training/utils/grafcet-ladder";
import { stopButton } from "@/templates/training/utils/training-variables";

/**
 * Command: E0 ─dem_entree ET places < CAPACITE→ E1 (barrière, places+1) ─passage→ E2 ─NON passage→ E0
 *          E0 ─dem_sortie ET places > 0→ E3 (barrière, places-1) ─passage→ E4 ─NON passage→ E0
 */
export const PARKING_COMMAND_SPEC: GrafcetLadderSpec = {
	steps: ["M0", "M1", "M2", "M3", "M4"],
	initial: ["M0"],
	transitions: [
		{
			name: "T0",
			from: ["M0"],
			to: ["M1"],
			receptivity: [no("dem_entree"), compare("places", "<", `${CAPACITE}`)],
		},
		{
			name: "T1",
			from: ["M0"],
			to: ["M3"],
			receptivity: [no("dem_sortie"), compare("places", ">", "0")],
		},
		{ name: "T2", from: ["M1"], to: ["M2"], receptivity: [no("passage")] },
		{ name: "T3", from: ["M3"], to: ["M4"], receptivity: [no("passage")] },
		{ name: "T4", from: ["M2"], to: ["M0"], receptivity: [nf("passage")] },
		{ name: "T5", from: ["M4"], to: ["M0"], receptivity: [nf("passage")] },
	],
	resetCondition: [nf("arret")],
};

/** Signalisation: S0 ─places >= CAPACITE→ S1 (complet) ─places < CAPACITE→ S0. */
export const PARKING_SIGNALLING_SPEC: GrafcetLadderSpec = {
	steps: ["S0", "S1"],
	initial: ["S0"],
	initMemory: "init_signalisation",
	transitions: [
		{
			name: "TS0",
			from: ["S0"],
			to: ["S1"],
			receptivity: [compare("places", ">=", `${CAPACITE}`)],
		},
		{
			name: "TS1",
			from: ["S1"],
			to: ["S0"],
			receptivity: [compare("places", "<", `${CAPACITE}`)],
		},
	],
};

/** Parking variables (without HMI), stop button, command memories; signalling already in Ladder. */
function createBase(name: string): Project {
	const project = new Project(createRandomId(), name, "");
	project.variables.push(
		...createParkingVariables(),
		stopButton("arret"),
		...grafcetMemories(PARKING_COMMAND_SPEC),
		...grafcetMemories(PARKING_SIGNALLING_SPEC),
	);
	const signalling = project.createLadder("Signalisation");
	signalling.sections = grafcetSections(PARKING_SIGNALLING_SPEC, [
		{ variable: "complet", steps: ["S1"] },
	]);
	project.main.sections = [section("Signalisation", "GRAFCET de signalisation, fourni.", callProgram(signalling.id))];
	return project;
}

export function createParkingLadderProject(): Project {
	return createBase("Parking en Ladder");
}

export function createParkingLadderSolution(): Project {
	const project = createBase("Parking en Ladder : solution");
	setMainSections(project, [
		...project.main.sections,
		...grafcetSections(PARKING_COMMAND_SPEC, [
			{ variable: "barriere", steps: ["M1", "M3"] },
		]),
		section(
			"Entrée d'un véhicule",
			"Action sur front d'étape : une seule unité ajoutée par passage.",
			rising("M1"),
			arithmetic("places", "places", "+", "1"),
		),
		section(
			"Sortie d'un véhicule",
			"Action sur front d'étape : une seule unité retirée par passage.",
			rising("M3"),
			arithmetic("places", "places", "-", "1"),
		),
	]);
	return project;
}
