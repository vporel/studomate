import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import { nf, no, or, rising, setMainSections } from "@/templates/training/utils/ladder-dsl";
import { createGateCommonVariables } from "./ladder-gate.template";
import {
	GrafcetLadderSpec,
	grafcetMemories,
	grafcetSections,
} from "@/templates/training/utils/grafcet-ladder";
import { pushButton } from "@/templates/training/utils/training-variables";

const pressOrStop = or([rising("telecommande")], [nf("arret")]);

/**
 * M0 closed (initial), M1 opening, M2 open, M3 closing, M4 stopped while opening, M5 stopped
 * while closing. A press opens, closes or stops; after a stop it reverses the last movement;
 * the photocell reopens while closing.
 */
export const GATE_SPEC: GrafcetLadderSpec = {
	steps: ["M0", "M1", "M2", "M3", "M4", "M5"],
	initial: ["M0"],
	transitions: [
		{ name: "T0", from: ["M0"], to: ["M1"], receptivity: [rising("telecommande")] },
		{ name: "T1", from: ["M1"], to: ["M2"], receptivity: [no("fc_ouvert")] },
		{ name: "T2", from: ["M1"], to: ["M4"], receptivity: [pressOrStop, nf("fc_ouvert")] },
		{ name: "T3", from: ["M2"], to: ["M3"], receptivity: [rising("telecommande")] },
		{ name: "T4", from: ["M3"], to: ["M0"], receptivity: [no("fc_ferme")] },
		{
			name: "T5",
			from: ["M3"],
			to: ["M5"],
			receptivity: [pressOrStop, nf("barriere_immaterielle"), nf("fc_ferme")],
		},
		{ name: "T6", from: ["M3"], to: ["M1"], receptivity: [no("barriere_immaterielle"), nf("fc_ferme")] },
		{ name: "T7", from: ["M4"], to: ["M3"], receptivity: [rising("telecommande")] },
		{ name: "T8", from: ["M5"], to: ["M1"], receptivity: [rising("telecommande")] },
	],
};

/** Gate variables (single-button remote), step memories; the specification has no GRAFCET. */
function createBase(name: string): Project {
	const project = new Project(createRandomId(), name, "");
	project.variables.push(
		pushButton("telecommande"),
		...createGateCommonVariables(),
		...grafcetMemories(GATE_SPEC),
	);
	return project;
}

export function createGateGrafcetLadderProject(): Project {
	return createBase("Portail à télécommande");
}

export function createGateGrafcetLadderSolution(): Project {
	const project = createBase("Portail à télécommande : solution");
	setMainSections(
		project,
		grafcetSections(GATE_SPEC, [
			{ variable: "ouvrir", steps: ["M1"] },
			{ variable: "fermer", steps: ["M3"] },
		]),
	);
	return project;
}
