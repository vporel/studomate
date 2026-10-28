import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import { nf, no, timer } from "@/templates/training/utils/ladder-dsl";
import {
	GrafcetLadderSpec,
	grafcetMemories,
	addGrafcetPrograms,
	grafcetProgramSections,
} from "@/templates/training/utils/grafcet-ladder";
import {
	output,
	stopButton,
	toggleSwitch,
} from "@/templates/training/utils/training-variables";

/** Green 5 s → orange 2 s → red 5 s, looping while `marche` is true; `arret` re-initializes. */
export function createTrafficLightSpec(
	locale: Locale = "fr",
): GrafcetLadderSpec {
	const t = createTemplateText("traffic-light-ladder", locale);
	const greenTimer = t("greenTimerName");
	const amberTimer = t("amberTimerName");
	const redTimer = t("redTimerName");
	return {
		steps: ["X0", "X1", "X2"],
		initial: ["X0"],
		transitions: [
			{
				from: ["X0"],
				to: ["X1"],
				receptivity: [timer("TON", greenTimer, "T#5s")],
			},
			{
				from: ["X1"],
				to: ["X2"],
				receptivity: [timer("TON", amberTimer, "T#2s")],
			},
			{
				from: ["X2"],
				to: ["X0"],
				receptivity: [timer("TON", redTimer, "T#5s"), no("marche")],
			},
		],
		resetCondition: [nf("arret")],
	};
}

export const TRAFFIC_LIGHT_SPEC = createTrafficLightSpec();

function createBase(name: string): Project {
	const project = new Project(createRandomId(), name, "");
	project.variables.push(
		output("rouge"),
		output("orange"),
		output("vert"),
		stopButton("arret"),
		toggleSwitch("marche"),
		...grafcetMemories(TRAFFIC_LIGHT_SPEC),
	);
	return project;
}

export function createTrafficLightLadderProject(
	locale: Locale = "fr",
): Project {
	const t = createTemplateText("traffic-light-ladder", locale);
	const project = createBase(t("projectName"));
	addGrafcetPrograms(project, { cycle: [], outputs: [] }, locale);
	return project;
}

export function createTrafficLightLadderSolution(
	locale: Locale = "fr",
): Project {
	const t = createTemplateText("traffic-light-ladder", locale);
	const project = createBase(t("solutionName"));
	const spec = createTrafficLightSpec(locale);
	addGrafcetPrograms(
		project,
		grafcetProgramSections(
			spec,
			[
				{ variable: "vert", steps: ["X0"] },
				{ variable: "orange", steps: ["X1"] },
				{ variable: "rouge", steps: ["X2"] },
			],
			locale,
		),
		locale,
	);
	return project;
}
