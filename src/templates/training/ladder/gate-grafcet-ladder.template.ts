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
 * X0 closed (initial), X1 opening, X2 open, X3 closing, X4 stopped while opening, X5 stopped
 * while closing. A press opens, closes or stops; after a stop it reverses the last movement;
 * the photocell reopens while closing.
 */
export const GATE_SPEC: GrafcetLadderSpec = {
	steps: ["X0", "X1", "X2", "X3", "X4", "X5"],
	initial: ["X0"],
	transitions: [
		{ name: "T0", from: ["X0"], to: ["X1"], receptivity: [rising("telecommande")] },
		{ name: "T1", from: ["X1"], to: ["X2"], receptivity: [no("fc_ouvert")] },
		{ name: "T2", from: ["X1"], to: ["X4"], receptivity: [pressOrStop, nf("fc_ouvert")] },
		{ name: "T3", from: ["X2"], to: ["X3"], receptivity: [rising("telecommande")] },
		{ name: "T4", from: ["X3"], to: ["X0"], receptivity: [no("fc_ferme")] },
		{
			name: "T5",
			from: ["X3"],
			to: ["X5"],
			receptivity: [pressOrStop, nf("barriere_immaterielle"), nf("fc_ferme")],
		},
		{ name: "T6", from: ["X3"], to: ["X1"], receptivity: [no("barriere_immaterielle"), nf("fc_ferme")] },
		{ name: "T7", from: ["X4"], to: ["X3"], receptivity: [rising("telecommande")] },
		{ name: "T8", from: ["X5"], to: ["X1"], receptivity: [rising("telecommande")] },
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
			{ variable: "ouvrir", steps: ["X1"] },
			{ variable: "fermer", steps: ["X3"] },
		]),
	);
	return project;
}
