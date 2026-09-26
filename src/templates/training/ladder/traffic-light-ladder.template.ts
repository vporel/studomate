import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import { nf, no, section, setMainSections, timer } from "@/templates/training/utils/ladder-dsl";
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
export const TRAFFIC_LIGHT_SPEC: GrafcetLadderSpec = {
	steps: ["M0", "M1", "M2"],
	initial: ["M0"],
	transitions: [
		{ name: "T0", from: ["M0"], to: ["M1"], receptivity: [no("t_vert.Q")] },
		{ name: "T1", from: ["M1"], to: ["M2"], receptivity: [no("t_orange.Q")] },
		{
			name: "T2",
			from: ["M2"],
			to: ["M0"],
			receptivity: [no("t_rouge.Q"), no("marche")],
		},
	],
	resetCondition: [nf("arret")],
};

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

export function createTrafficLightLadderProject(): Project {
	return createBase("Feu tricolore en Ladder");
}

export function createTrafficLightLadderSolution(): Project {
	const project = createBase("Feu tricolore en Ladder : solution");
	setMainSections(project, [
		section("Temporisation du vert", "", no("M0"), timer("TON", "t_vert", "T#5s")),
		section("Temporisation de l'orange", "", no("M1"), timer("TON", "t_orange", "T#2s")),
		section("Temporisation du rouge", "", no("M2"), timer("TON", "t_rouge", "T#5s")),
		...grafcetSections(TRAFFIC_LIGHT_SPEC, [
			{ variable: "vert", steps: ["M0"] },
			{ variable: "orange", steps: ["M1"] },
			{ variable: "rouge", steps: ["M2"] },
		]),
	]);
	return project;
}
