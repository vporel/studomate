import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
import Project from "@/schemas/project/project.schema";
import { createAndDivergenceBase } from "@/templates/training/grafcet/and-divergence.template";
import { no } from "@/templates/training/utils/ladder-dsl";
import {
	GrafcetLadderSpec,
	grafcetMemories,
	addGrafcetPrograms,
	grafcetProgramSections,
} from "@/templates/training/utils/grafcet-ladder";

/** E0 ─dcy→ (E1 ∥ E2) ─capteur1 ET capteur2→ E0 */
export const AND_DIVERGENCE_SPEC: GrafcetLadderSpec = {
	steps: ["X0", "X1", "X2"],
	initial: ["X0"],
	transitions: [
		{ from: ["X0"], to: ["X1", "X2"], receptivity: [no("dcy")] },
		{
			from: ["X1", "X2"],
			to: ["X0"],
			receptivity: [no("capteur1"), no("capteur2")],
		},
	],
};

function createBase(name: string, locale: Locale): Project {
	const project = createAndDivergenceBase(locale);
	project.name = name;
	project.variables.push(...grafcetMemories(AND_DIVERGENCE_SPEC));
	return project;
}

export function createAndDivergenceLadderProject(
	locale: Locale = "fr",
): Project {
	const t = createTemplateText("and-divergence-ladder", locale);
	const project = createBase(t("projectName"), locale);
	addGrafcetPrograms(project, { cycle: [], outputs: [] }, locale);
	return project;
}

export function createAndDivergenceLadderSolution(
	locale: Locale = "fr",
): Project {
	const t = createTemplateText("and-divergence-ladder", locale);
	const project = createBase(t("solutionName"), locale);
	addGrafcetPrograms(
		project,
		grafcetProgramSections(
			AND_DIVERGENCE_SPEC,
			[
				{ variable: "sortie1", steps: ["X1"] },
				{ variable: "sortie2", steps: ["X2"] },
			],
			locale,
		),
		locale,
	);
	return project;
}
