import * as templates from "./drilling-ladder.template";
import type { Locale } from "@/i18n/config";
import type Project from "@/schemas/project/project.schema";
import PlcScenario from "@tests/utils/plc-scenario";
import {
	calledPrograms,
	executionSections,
} from "@tests/utils/execution-sections";
import type { LadderElement } from "@/schemas/ladder/element.schema";
import {
	createDrillingLadderProject,
	createDrillingLadderSolution,
} from "./drilling-ladder.template";

function timerNamesIn(project: Project, title: string): string[] {
	const section = executionSections(project).find((s) => s.title === title);
	if (!section) throw new Error(`Section ${title} not found`);
	return section.elements.flatMap((element: LadderElement) =>
		element.type === "block" && element.data.blockType === "timer"
			? [element.data.params.name]
			: [],
	);
}

describe("drilling-ladder.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé fournit la partie opérative appelée par le Main, sans commande", () => {
		const project = createDrillingLadderProject();
		expect(project.main.sections).toHaveLength(1);
		expect(project.variables.map((v) => v.mnemonic)).toEqual(
			expect.arrayContaining(["blocage", "acquittement", "position", "X0"]),
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

	it("les TON sont dans les réseaux des transitions qu'ils temporisent", () => {
		const project = createDrillingLadderSolution();
		expect(timerNamesIn(project, "X2 -> X3")).toEqual(["t_perc"]);
		expect(timerNamesIn(project, "X1 -> X3")).toEqual(["t_surv"]);
		const withTimer = executionSections(project)
			.filter((s) => timerNamesIn(project, s.title).length > 0)
			.map((s) => s.title);
		expect(withTimer).toEqual(["X2 -> X3", "X1 -> X3"]);
	});

	it("le Main appelle la partie opérative, puis Defauts, Cycle_automatique et Sorties", () => {
		const project = createDrillingLadderSolution();
		expect(project.main.sections[0].title).not.toBe("Defauts");
		expect(calledPrograms(project).map((p) => p.name)).toEqual([
			"Partie opérative",
			"Defauts",
			"Cycle_automatique",
			"Sorties",
		]);
	});

	it("Defauts contient l'acquittement (bobine R) puis la mémorisation par le TON de surveillance (bobine S)", () => {
		const faults = calledPrograms(createDrillingLadderSolution()).find(
			(p) => p.name === "Defauts",
		)!;
		expect(faults.sections.map((s) => s.title)).toEqual([
			"Acquittement du défaut",
			"Défaut mémorisé",
		]);
	});

	it("le TON de surveillance reste dans Cycle_automatique, lu par Defauts", () => {
		const cycle = calledPrograms(createDrillingLadderSolution()).find(
			(p) => p.name === "Cycle_automatique",
		)!;
		expect(cycle.sections.map((s) => s.title)).toContain("X1 -> X3");
	});

	it("le défaut interdit le départ de cycle tant qu'il n'est pas acquitté", async () => {
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
		expect(scenario.get("X0")).toBe(true);
		expect(scenario.get("descendre")).toBe(false);
		expect(scenario.get("defaut")).toBe(true);
		scenario.stop();
	});

	it("un appui sur acquittement efface le défaut et autorise un nouveau cycle", async () => {
		const scenario = new PlcScenario(createDrillingLadderSolution());
		await scenario.cycles(3);
		await scenario.tap("dcy", 1);
		await scenario.seconds(2);
		scenario.set("blocage", true);
		await scenario.seconds(7);
		await scenario.seconds(6);
		expect(scenario.get("defaut")).toBe(true);
		scenario.set("blocage", false);
		await scenario.tap("acquittement", 1);
		await scenario.cycles(2);
		expect(scenario.get("defaut")).toBe(false);
		await scenario.tap("dcy", 1);
		await scenario.cycles(2);
		expect(scenario.get("descendre")).toBe(true);
		scenario.stop();
	});

	it("dans Defauts, l'acquittement (R) est écrit avant la mémorisation (S) : une cause qui persiste repose le défaut", () => {
		const faults = calledPrograms(createDrillingLadderSolution()).find(
			(p) => p.name === "Defauts",
		)!;
		const coilTypes = faults.sections.map(
			(s) =>
				s.elements.find(
					(e): e is Extract<LadderElement, { type: "coil" }> =>
						e.type === "coil",
				)!.data.type,
		);
		expect(coilTypes).toEqual(["reset", "set"]);
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
