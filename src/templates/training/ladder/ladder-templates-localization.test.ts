import type Project from "@/schemas/project/project.schema";
import {
	createLadderScalingProject,
	createLadderScalingSolution,
} from "./ladder-scaling.template";
import {
	createLadderSelfHoldingProject,
	createLadderSelfHoldingSolution,
} from "./ladder-self-holding.template";
import {
	createLadderSubprogramsProject,
	createLadderSubprogramsSolution,
} from "./ladder-subprograms.template";
import {
	createLadderTankProject,
	createLadderTankSolution,
} from "./ladder-tank.template";
import { createLadderTimersReadingProject } from "./ladder-timers-reading.template";
import {
	createLadderTimersProject,
	createLadderTimersSolution,
} from "./ladder-timers.template";
import {
	createLadderToggleProject,
	createLadderToggleSolution,
} from "./ladder-toggle.template";
import {
	createLinearSequenceLadderProject,
	createLinearSequenceLadderSolution,
	createLinearSequenceNaiveLadderProject,
} from "./linear-sequence-ladder.template";
import {
	createOrDivergenceLadderProject,
	createOrDivergenceLadderSolution,
} from "./or-divergence-ladder.template";
import {
	createParkingLadderProject,
	createParkingLadderSolution,
} from "./parking-ladder.template";
import {
	createTrafficLightLadderProject,
	createTrafficLightLadderSolution,
} from "./traffic-light-ladder.template";
import type { Locale } from "@/i18n/config";

type Case = [string, (locale?: Locale) => Project, string, string];

const CASES: Case[] = [
	["ladder-scaling", createLadderScalingProject, "Mise à l'échelle", "Scaling"],
	[
		"ladder-scaling solution",
		createLadderScalingSolution,
		"Mise à l'échelle : solution",
		"Scaling: solution",
	],
	[
		"ladder-self-holding",
		createLadderSelfHoldingProject,
		"Pompe : auto-maintien",
		"Pump: self-holding",
	],
	[
		"ladder-self-holding solution",
		createLadderSelfHoldingSolution,
		"Pompe : auto-maintien : solution",
		"Pump: self-holding: solution",
	],
	[
		"ladder-subprograms",
		createLadderSubprogramsProject,
		"Sous-programmes",
		"Subprograms",
	],
	[
		"ladder-subprograms solution",
		createLadderSubprogramsSolution,
		"Sous-programmes : solution",
		"Subprograms: solution",
	],
	["ladder-tank", createLadderTankProject, "Cuve", "Tank"],
	[
		"ladder-tank solution",
		createLadderTankSolution,
		"Cuve : solution",
		"Tank: solution",
	],
	[
		"ladder-timers-reading",
		createLadderTimersReadingProject,
		"Lire les temporisations",
		"Reading timers",
	],
	[
		"ladder-timers",
		createLadderTimersProject,
		"Démarrage étoile-triangle",
		"Star-delta start",
	],
	[
		"ladder-timers solution",
		createLadderTimersSolution,
		"Démarrage étoile-triangle : solution",
		"Star-delta start: solution",
	],
	["ladder-toggle", createLadderToggleProject, "Télérupteur", "Impulse relay"],
	[
		"ladder-toggle solution",
		createLadderToggleSolution,
		"Télérupteur : solution",
		"Impulse relay: solution",
	],
	[
		"linear-sequence-ladder",
		createLinearSequenceLadderProject,
		"Séquence linéaire en Ladder",
		"Linear sequence in Ladder",
	],
	[
		"linear-sequence-ladder solution",
		createLinearSequenceLadderSolution,
		"Séquence linéaire en Ladder : solution",
		"Linear sequence in Ladder: solution",
	],
	[
		"linear-sequence-naive-ladder",
		createLinearSequenceNaiveLadderProject,
		"Séquence linéaire : méthode des manuels",
		"Linear sequence: textbook method",
	],
	[
		"or-divergence-ladder",
		createOrDivergenceLadderProject,
		"Divergence en OU en Ladder",
		"OR divergence in Ladder",
	],
	[
		"or-divergence-ladder solution",
		createOrDivergenceLadderSolution,
		"Divergence en OU en Ladder : solution",
		"OR divergence in Ladder: solution",
	],
	[
		"parking-ladder",
		createParkingLadderProject,
		"Parking en Ladder",
		"Parking in Ladder",
	],
	[
		"parking-ladder solution",
		createParkingLadderSolution,
		"Parking en Ladder : solution",
		"Parking in Ladder: solution",
	],
	[
		"traffic-light-ladder",
		createTrafficLightLadderProject,
		"Feu tricolore en Ladder",
		"Traffic light in Ladder",
	],
	[
		"traffic-light-ladder solution",
		createTrafficLightLadderSolution,
		"Feu tricolore en Ladder : solution",
		"Traffic light in Ladder: solution",
	],
];

function visibleTexts(project: Project): string[] {
	const ladders = [project.main, ...Object.values(project.ladders)];
	return [
		project.name,
		...Object.values(project.programs).map((program) => program.name),
		...ladders.flatMap((ladder) =>
			ladder.sections.flatMap((s) => [s.title, s.description]),
		),
	];
}

describe("localisation des templates Ladder de formation", () => {
	it.each(CASES)("%s : nom du projet en français", (_id, create, fr) => {
		expect(create("fr").name).toBe(fr);
		expect(create().name).toBe(fr);
	});

	it.each(CASES)("%s : nom du projet en anglais", (_id, create, _fr, en) => {
		expect(create("en").name).toBe(en);
	});

	it.each(CASES)(
		"%s : aucun texte visible accentué en anglais",
		(_id, create) => {
			for (const text of visibleTexts(create("en"))) {
				expect(text).not.toMatch(/[À-ÿ]/);
			}
		},
	);

	it("les sous-programmes et les timers prennent le nom de la langue", () => {
		expect(
			Object.values(createLadderSubprogramsSolution("en").ladders).map(
				(ladder) => ladder.name,
			),
		).toContain("Counting");
		expect(
			Object.values(createParkingLadderSolution("en").ladders).map(
				(ladder) => ladder.name,
			),
		).toContain("Signalling");
	});
});
