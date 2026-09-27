import Project from "@/schemas/project/project.schema";
import { createAndDivergenceProject } from "@/templates/training/grafcet/and-divergence.template";
import { no, setMainSections } from "@/templates/training/utils/ladder-dsl";
import {
	GrafcetLadderSpec,
	grafcetMemories,
	grafcetSections,
} from "@/templates/training/utils/grafcet-ladder";

/** E0 ─dcy→ (E1 ∥ E2) ─capteur1 ET capteur2→ E0 */
export const AND_DIVERGENCE_SPEC: GrafcetLadderSpec = {
	steps: ["X0", "X1", "X2"],
	initial: ["X0"],
	transitions: [
		{ name: "T0", from: ["X0"], to: ["X1", "X2"], receptivity: [no("dcy")] },
		{
			name: "T1",
			from: ["X1", "X2"],
			to: ["X0"],
			receptivity: [no("capteur1"), no("capteur2")],
		},
	],
};

function createBase(name: string): Project {
	const project = createAndDivergenceProject();
	project.name = name;
	project.variables.push(...grafcetMemories(AND_DIVERGENCE_SPEC));
	return project;
}

export function createAndDivergenceLadderProject(): Project {
	return createBase("Divergence en ET en Ladder");
}

export function createAndDivergenceLadderSolution(): Project {
	const project = createBase("Divergence en ET en Ladder : solution");
	setMainSections(
		project,
		grafcetSections(AND_DIVERGENCE_SPEC, [
			{ variable: "sortie1", steps: ["X1"] },
			{ variable: "sortie2", steps: ["X2"] },
		]),
	);
	return project;
}
