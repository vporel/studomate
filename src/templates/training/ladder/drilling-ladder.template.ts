import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	addDrillingOperativePart,
	createDrillingVariables,
} from "@/templates/drilling.template";
import {
	no,
	resetCoil,
	section,
	setCoil,
	timer,
} from "@/templates/training/utils/ladder-dsl";
import {
	GrafcetLadderSpec,
	grafcetMemories,
	grafcetSections,
} from "@/templates/training/utils/grafcet-ladder";
import { memory, toggleSwitch } from "@/templates/training/utils/training-variables";

export const DESCENT_WATCHDOG_SECONDS = 8;

/**
 * E0 ─dcy→ E1 (descendre, broche) ─b→ E2 (broche, 2 s) ─t_perc→ E3 (monter, broche) ─h→ E0,
 * plus E1 ─t_surv (descent watchdog)→ E3.
 */
export const DRILLING_SPEC: GrafcetLadderSpec = {
	steps: ["M0", "M1", "M2", "M3"],
	initial: ["M0"],
	transitions: [
		{ name: "T0", from: ["M0"], to: ["M1"], receptivity: [no("dcy")] },
		{ name: "T1", from: ["M1"], to: ["M2"], receptivity: [no("b")] },
		{ name: "T2", from: ["M2"], to: ["M3"], receptivity: [no("t_perc.Q")] },
		{ name: "T3", from: ["M3"], to: ["M0"], receptivity: [no("h")] },
		{ name: "T4", from: ["M1"], to: ["M3"], receptivity: [no("t_surv.Q")] },
	],
};

/** Drilling variables with the `blocage` switch, the operative part called by the Main, no control. */
function createBase(name: string): Project {
	const project = new Project(createRandomId(), name, "");
	project.variables.push(
		...createDrillingVariables(),
		toggleSwitch("blocage"),
		memory("defaut"),
		...grafcetMemories(DRILLING_SPEC),
	);
	addDrillingOperativePart(project, { blockable: true });
	return project;
}

export function createDrillingLadderProject(): Project {
	return createBase("Poste de perçage en Ladder");
}

export function createDrillingLadderSolution(): Project {
	const project = createBase("Poste de perçage en Ladder : solution");
	const [callSection] = project.main.sections;
	project.main.sections = [
		callSection,
		section("Temporisation de perçage", "Le TON mesure le perçage.", no("M2"), timer("TON", "t_perc", "T#2s")),
		section(
			"Surveillance de la descente",
			`Le TON surveille la descente : au bout de ${DESCENT_WATCHDOG_SECONDS} s sans atteindre le bas, la transition de repli est franchie.`,
			no("M1"),
			timer("TON", "t_surv", `T#${DESCENT_WATCHDOG_SECONDS}s`),
		),
		section("Défaut mémorisé", "Le défaut de descente est mémorisé.", no("t_surv.Q"), setCoil("defaut")),
		...grafcetSections(DRILLING_SPEC, [
			{ variable: "descendre", steps: ["M1"] },
			{ variable: "broche", steps: ["M1", "M2", "M3"] },
			{ variable: "monter", steps: ["M3"] },
		]),
		section("Acquittement du défaut", "Un nouveau cycle efface le défaut.", no("T0"), resetCoil("defaut")),
	];
	return project;
}

