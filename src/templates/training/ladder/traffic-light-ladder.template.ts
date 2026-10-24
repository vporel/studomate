import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	nf,
	no,
	section,
	setMainSections,
	timer,
} from "@/templates/training/utils/ladder-dsl";
import {
	GrafcetLadderSpec,
	grafcetMemories,
	grafcetSections,
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
				receptivity: [no(`${greenTimer}.Q`)],
			},
			{
				from: ["X1"],
				to: ["X2"],
				receptivity: [no(`${amberTimer}.Q`)],
			},
			{
				from: ["X2"],
				to: ["X0"],
				receptivity: [no(`${redTimer}.Q`), no("marche")],
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
	return createBase(t("projectName"));
}

export function createTrafficLightLadderSolution(
	locale: Locale = "fr",
): Project {
	const t = createTemplateText("traffic-light-ladder", locale);
	const project = createBase(t("solutionName"));
	const spec = createTrafficLightSpec(locale);
	setMainSections(project, [
		section(
			t("greenDelayTitle"),
			"",
			no("X0"),
			timer("TON", t("greenTimerName"), "T#5s"),
		),
		section(
			t("amberDelayTitle"),
			"",
			no("X1"),
			timer("TON", t("amberTimerName"), "T#2s"),
		),
		section(
			t("redDelayTitle"),
			"",
			no("X2"),
			timer("TON", t("redTimerName"), "T#5s"),
		),
		...grafcetSections(
			spec,
			[
				{ variable: "vert", steps: ["X0"] },
				{ variable: "orange", steps: ["X1"] },
				{ variable: "rouge", steps: ["X2"] },
			],
			locale,
		),
	]);
	return project;
}
