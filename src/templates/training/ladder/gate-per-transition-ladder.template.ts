import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	grafcetMemories,
	addGrafcetPrograms,
	grafcetProgramSections,
} from "@/templates/training/utils/grafcet-ladder";
import { pushButton } from "@/templates/training/utils/training-variables";
import { createGateCommonVariables } from "./ladder-gate.template";
import { GATE_SPEC } from "./gate-grafcet-ladder.template";

/** The gate GRAFCET implemented with one network per transition, in the order of its spec. */
export function createGatePerTransitionLadderProject(
	locale: Locale = "fr",
): Project {
	const t = createTemplateText("gate-per-transition-ladder", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
	project.variables.push(
		pushButton("telecommande"),
		...createGateCommonVariables(locale),
		...grafcetMemories(GATE_SPEC),
	);
	addGrafcetPrograms(
		project,
		grafcetProgramSections(
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
