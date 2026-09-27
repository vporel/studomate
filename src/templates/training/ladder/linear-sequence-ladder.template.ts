import Project from "@/schemas/project/project.schema";
import {
	createLinearSequenceProject,
	createLinearSequenceSolution,
} from "@/templates/training/grafcet/linear-sequence.template";
import {
	GrafcetLadderSpec,
	grafcetMemories,
	grafcetSections,
} from "@/templates/training/utils/grafcet-ladder";
import { no, coil, nf, or, section, setMainSections } from "@/templates/training/utils/ladder-dsl";

/** E0 (initial) ─dcy→ E1 (sortie1) ─fin1→ E2 (sortie2) ─fin2→ E3 ─VRAI→ E0 */
export const LINEAR_SEQUENCE_SPEC: GrafcetLadderSpec = {
	steps: ["X0", "X1", "X2", "X3"],
	initial: ["X0"],
	transitions: [
		{ name: "T0", from: ["X0"], to: ["X1"], receptivity: [no("dcy")] },
		{ name: "T1", from: ["X1"], to: ["X2"], receptivity: [no("fin1")] },
		{ name: "T2", from: ["X2"], to: ["X3"], receptivity: [no("fin2")] },
		{ name: "T3", from: ["X3"], to: ["X0"], receptivity: [] },
	],
};

/** Variables of `linear-sequence` plus the step memories (X0…X3), shared by both Ladder variants. */
function createLinearSequenceLadderBase(name: string): Project {
	const project = createLinearSequenceProject();
	project.name = name;
	project.variables.push(...grafcetMemories(LINEAR_SEQUENCE_SPEC));
	return project;
}

export function createLinearSequenceLadderProject(): Project {
	return createLinearSequenceLadderBase("Séquence linéaire en Ladder");
}

export function createLinearSequenceLadderSolution(): Project {
	const project = createLinearSequenceLadderBase("Séquence linéaire en Ladder : solution");
	setMainSections(
		project,
		grafcetSections(LINEAR_SEQUENCE_SPEC, [
			{ variable: "sortie1", steps: ["X1"] },
			{ variable: "sortie2", steps: ["X2"] },
		]),
	);
	return project;
}

/**
 * The textbook method: one self-holding per step, `Xn = Xn-1·Rn-1 + Xn·/Xn+1`. At each crossing,
 * two consecutive steps stay active for one scan. The implemented GRAFCET is drawn alongside,
 * excluded from execution.
 */
export function createLinearSequenceNaiveLadderProject(): Project {
	const project = createLinearSequenceLadderBase("Séquence linéaire : méthode des manuels");
	for (const grafcet of Object.values(createLinearSequenceSolution().grafcets)) {
		grafcet.excludedFromExecution = true;
		project.addProgram(grafcet);
	}
	const held = (
		step: string,
		previous: string,
		receptivity: ReturnType<typeof no>[],
		next: string,
	) =>
		section(
			`Étape ${step}`,
			"Auto-maintien : activée par l'étape précédente, désactivée par l'étape suivante.",
			or([no(previous), ...receptivity], [no(step)]),
			nf(next),
			coil(step),
		);
	setMainSections(project, [
		section(
			"Étape X0",
			"Étape initiale : activée au premier cycle ou par la fin de séquence.",
			or([no("X3")], [no("X0")], [no("_SYS_FIRST_SCAN")]),
			nf("X1"),
			coil("X0"),
		),
		held("X1", "X0", [no("dcy")], "X2"),
		held("X2", "X1", [no("fin1")], "X3"),
		held("X3", "X2", [no("fin2")], "X0"),
		section("Sortie sortie1", "", no("X1"), coil("sortie1")),
		section("Sortie sortie2", "", no("X2"), coil("sortie2")),
	]);
	return project;
}
