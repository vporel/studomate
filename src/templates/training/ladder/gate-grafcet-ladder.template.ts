import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import { nf, no, or, rising } from "@/templates/training/utils/ladder-dsl";
import { createGateCommonVariables } from "./ladder-gate.template";
import {
	GrafcetLadderSpec,
	grafcetThreeBlockMemories,
	addGrafcetPrograms,
	grafcetThreeBlockProgramSections,
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
		{
			from: ["X0"],
			to: ["X1"],
			receptivity: [rising("telecommande")],
		},
		{ from: ["X1"], to: ["X2"], receptivity: [no("fc_ouvert")] },
		{
			from: ["X1"],
			to: ["X4"],
			receptivity: [pressOrStop, nf("fc_ouvert")],
		},
		{
			from: ["X2"],
			to: ["X3"],
			receptivity: [rising("telecommande")],
		},
		{ from: ["X3"], to: ["X0"], receptivity: [no("fc_ferme")] },
		{
			from: ["X3"],
			to: ["X5"],
			receptivity: [pressOrStop, nf("barriere_immaterielle"), nf("fc_ferme")],
		},
		{
			from: ["X3"],
			to: ["X1"],
			receptivity: [no("barriere_immaterielle"), nf("fc_ferme")],
		},
		{
			from: ["X4"],
			to: ["X3"],
			receptivity: [rising("telecommande")],
		},
		{
			from: ["X5"],
			to: ["X1"],
			receptivity: [rising("telecommande")],
		},
	],
};

/** The gate GRAFCET implemented in three blocks: crossing conditions, step changes, outputs. */
export function createGateGrafcetLadderProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("gate-grafcet-ladder", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
	project.variables.push(
		pushButton("telecommande"),
		...createGateCommonVariables(locale),
		...grafcetThreeBlockMemories(GATE_SPEC),
	);
	addGrafcetPrograms(
		project,
		grafcetThreeBlockProgramSections(
			GATE_SPEC,
			[
				{ variable: "ouvrir", steps: ["X1"] },
				{ variable: "fermer", steps: ["X3"] },
			],
			locale,
		),
		locale,
	);
	return project;
}
