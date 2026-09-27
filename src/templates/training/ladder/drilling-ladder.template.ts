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
	steps: ["X0", "X1", "X2", "X3"],
	initial: ["X0"],
	transitions: [
		{ name: "T0", from: ["X0"], to: ["X1"], receptivity: [no("dcy")] },
		{ name: "T1", from: ["X1"], to: ["X2"], receptivity: [no("b")] },
		{ name: "T2", from: ["X2"], to: ["X3"], receptivity: [no("t_perc.Q")] },
		{ name: "T3", from: ["X3"], to: ["X0"], receptivity: [no("h")] },
		{ name: "T4", from: ["X1"], to: ["X3"], receptivity: [no("t_surv.Q")] },
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
		section("Temporisation de perçage", "Le TON mesure le perçage.", no("X2"), timer("TON", "t_perc", "T#2s")),
		section(
			"Surveillance de la descente",
			`Le TON surveille la descente : au bout de ${DESCENT_WATCHDOG_SECONDS} s sans atteindre le bas, la transition de repli est franchie.`,
			no("X1"),
			timer("TON", "t_surv", `T#${DESCENT_WATCHDOG_SECONDS}s`),
		),
		section("Défaut mémorisé", "Le défaut de descente est mémorisé.", no("t_surv.Q"), setCoil("defaut")),
		...grafcetSections(DRILLING_SPEC, [
			{ variable: "descendre", steps: ["X1"] },
			{ variable: "broche", steps: ["X1", "X2", "X3"] },
			{ variable: "monter", steps: ["X3"] },
		]),
		section("Acquittement du défaut", "Un nouveau cycle efface le défaut.", no("T0"), resetCoil("defaut")),
	];
	return project;
}

