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
	steps: ["M0", "M1", "M2"],
	initial: ["M0"],
	transitions: [
		{ name: "T0", from: ["M0"], to: ["M1"], receptivity: [no("dcy1")] },
		{ name: "T1", from: ["M0"], to: ["M2"], receptivity: [no("dcy2")] },
		{ name: "T2", from: ["M1"], to: ["M0"], receptivity: [no("fin1")] },
		{ name: "T3", from: ["M2"], to: ["M0"], receptivity: [no("fin2")] },
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
			{ variable: "sortie1", steps: ["M1"] },
			{ variable: "sortie2", steps: ["M2"] },
		]),
	);
	return project;
}
