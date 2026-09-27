import Project from "@/schemas/project/project.schema";
import { createOrDivergenceProject } from "@/templates/training/grafcet/or-divergence.template";
import { no, setMainSections } from "@/templates/training/utils/ladder-dsl";
import {
	GrafcetLadderSpec,
	grafcetMemories,
	grafcetSections,
} from "@/templates/training/utils/grafcet-ladder";

/** E0 ─dcy1→ E1 (sortie1) ─fin1→ E0, and E0 ─dcy2→ E2 (sortie2) ─fin2→ E0 */
export const OR_DIVERGENCE_SPEC: GrafcetLadderSpec = {
	steps: ["X0", "X1", "X2"],
	initial: ["X0"],
	transitions: [
		{ name: "T0", from: ["X0"], to: ["X1"], receptivity: [no("dcy1")] },
		{ name: "T1", from: ["X0"], to: ["X2"], receptivity: [no("dcy2")] },
		{ name: "T2", from: ["X1"], to: ["X0"], receptivity: [no("fin1")] },
		{ name: "T3", from: ["X2"], to: ["X0"], receptivity: [no("fin2")] },
	],
};

function createBase(name: string): Project {
	const project = createOrDivergenceProject();
	project.name = name;
	project.variables.push(...grafcetMemories(OR_DIVERGENCE_SPEC));
	return project;
}

export function createOrDivergenceLadderProject(): Project {
	return createBase("Divergence en OU en Ladder");
}

export function createOrDivergenceLadderSolution(): Project {
	const project = createBase("Divergence en OU en Ladder : solution");
	setMainSections(
		project,
		grafcetSections(OR_DIVERGENCE_SPEC, [
			{ variable: "sortie1", steps: ["X1"] },
			{ variable: "sortie2", steps: ["X2"] },
		]),
	);
	return project;
}
