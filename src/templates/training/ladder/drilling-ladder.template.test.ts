import * as templates from "./drilling-ladder.template";
import type { Locale } from "@/i18n/config";
import type Project from "@/schemas/project/project.schema";
import PlcScenario from "@tests/utils/plc-scenario";
import {
	createDrillingLadderProject,
	createDrillingLadderSolution,
} from "./drilling-ladder.template";

describe("drilling-ladder.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé fournit la partie opérative appelée par le Main, sans commande", () => {
		const project = createDrillingLadderProject();
		expect(project.main.sections).toHaveLength(1);
		expect(project.variables.map((v) => v.mnemonic)).toEqual(
			expect.arrayContaining(["blocage", "position", "X0"]),
		);
	});

	it("cycle normal : perçage temporisé, retour au repos, aucun défaut", async () => {
		const scenario = new PlcScenario(createDrillingLadderSolution());
		await scenario.cycles(3);
		await scenario.tap("dcy", 1);
		await scenario.cycles(2);
		expect(scenario.get("descendre")).toBe(true);
		expect(scenario.get("broche")).toBe(true);
		await scenario.seconds(6);
		expect(scenario.get("X2")).toBe(true);
		await scenario.seconds(3);
		expect(scenario.get("monter")).toBe(true);
		await scenario.seconds(8);
		expect(scenario.get("X0")).toBe(true);
		expect(scenario.get("position")).toBe(0);
		expect(scenario.get("defaut")).toBe(false);
		scenario.stop();
	});

	it("un foret bloqué déclenche le défaut mémorisé puis la remontée", async () => {
		const scenario = new PlcScenario(createDrillingLadderSolution());
		await scenario.cycles(3);
		await scenario.tap("dcy", 1);
		await scenario.seconds(2);
		scenario.set("blocage", true);
		await scenario.seconds(7);
		expect(scenario.get("defaut")).toBe(true);
		expect(scenario.get("monter")).toBe(true);
		await scenario.seconds(6);
		expect(scenario.get("X0")).toBe(true);
		expect(scenario.get("position")).toBe(0);
		expect(scenario.get("defaut")).toBe(true);
		scenario.stop();
	});

	it("un nouvel appui sur dcy efface le défaut", async () => {
		const scenario = new PlcScenario(createDrillingLadderSolution());
		await scenario.cycles(3);
		await scenario.tap("dcy", 1);
		await scenario.seconds(2);
		scenario.set("blocage", true);
		await scenario.seconds(7);
		expect(scenario.get("defaut")).toBe(true);
		await scenario.seconds(6);
		expect(scenario.get("X0")).toBe(true);
		scenario.set("blocage", false);
		await scenario.tap("dcy", 1);
		await scenario.cycles(2);
		expect(scenario.get("defaut")).toBe(false);
		scenario.stop();
	});
});

describe("drilling-ladder.template (langues)", () => {
	const builders: [(locale?: Locale) => Project, string, string][] = [
		[
			templates.createDrillingLadderProject,
			"Poste de perçage en Ladder",
			"Drilling station in Ladder",
		],
		[
			templates.createDrillingLadderSolution,
			"Poste de perçage en Ladder : solution",
			"Drilling station in Ladder: solution",
		],
	];

	it.each(builders)("garde le nom français en fr (%#)", (build, fr) => {
		expect(build().name).toBe(fr);
		expect(build("fr").name).toBe(fr);
	});

	it.each(builders)(
		"nomme le projet en anglais, sans accent (%#)",
		(build, _fr, en) => {
			const project = build("en");
			expect(project.name).toBe(en);
			const titles = Object.values(project.ladders)
				.flatMap((ladder) => [
					ladder.name,
					...ladder.sections.map((s) => s.title),
				])
				.join(" ");
			expect(titles).not.toMatch(/[À-ÿ]/);
		},
	);
});
