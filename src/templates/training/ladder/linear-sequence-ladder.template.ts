import Project from "@/schemas/project/project.schema";
import { createLinearSequenceProject } from "@/templates/training/grafcet/linear-sequence.template";
import {
	GrafcetLadderSpec,
	grafcetMemories,
	grafcetSections,
} from "@/templates/training/utils/grafcet-ladder";
import { no, coil, nf, or, section, setMainSections } from "@/templates/training/utils/ladder-dsl";

/** E0 (initial) ─dcy→ E1 (sortie1) ─fin1→ E2 (sortie2) ─fin2→ E3 ─VRAI→ E0 */
export const LINEAR_SEQUENCE_SPEC: GrafcetLadderSpec = {
	steps: ["M0", "M1", "M2", "M3"],
	initial: ["M0"],
	transitions: [
		{ name: "T0", from: ["M0"], to: ["M1"], receptivity: [no("dcy")] },
		{ name: "T1", from: ["M1"], to: ["M2"], receptivity: [no("fin1")] },
		{ name: "T2", from: ["M2"], to: ["M3"], receptivity: [no("fin2")] },
		{ name: "T3", from: ["M3"], to: ["M0"], receptivity: [] },
	],
};

/** Variables of `linear-sequence` plus the step memories (M0…M3), shared by both Ladder variants. */
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
			{ variable: "sortie1", steps: ["M1"] },
			{ variable: "sortie2", steps: ["M2"] },
		]),
	);
	return project;
}

/**
 * The textbook method: one self-holding per step, `Xn = Xn-1·Rn-1 + Xn·/Xn+1`. At each crossing,
 * two consecutive steps stay active for one scan.
 */
export function createLinearSequenceNaiveLadderProject(): Project {
	const project = createLinearSequenceLadderBase("Séquence linéaire : méthode des manuels");
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
			"Étape M0",
			"Étape initiale : activée au premier cycle ou par la fin de séquence.",
			or([no("M3")], [no("M0")], [no("_SYS_FIRST_SCAN")]),
			nf("M1"),
			coil("M0"),
		),
		held("M1", "M0", [no("dcy")], "M2"),
		held("M2", "M1", [no("fin1")], "M3"),
		held("M3", "M2", [no("fin2")], "M0"),
		section("Sortie sortie1", "", no("M1"), coil("sortie1")),
		section("Sortie sortie2", "", no("M2"), coil("sortie2")),
	]);
	return project;
}
