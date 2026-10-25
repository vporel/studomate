import PlcScenario from "@tests/utils/plc-scenario";
import type Project from "@/schemas/project/project.schema";
import type { LadderElement } from "@/schemas/ladder/element.schema";
import {
	calledPrograms,
	executionSections,
} from "@tests/utils/execution-sections";
import {
	createTrafficLightLadderProject,
	createTrafficLightLadderSolution,
} from "./traffic-light-ladder.template";

function sectionByTitle(project: Project, title: string) {
	const section = executionSections(project).find((s) => s.title === title);
	if (!section) throw new Error(`Section ${title} not found`);
	return section;
}

function timerNamesIn(project: Project, title: string): string[] {
	return sectionByTitle(project, title).elements.flatMap((element) =>
		element.type === "block" && element.data.blockType === "timer"
			? [element.data.params.name]
			: [],
	);
}

function xOf(
	project: Project,
	title: string,
	match: (e: LadderElement) => boolean,
) {
	return sectionByTitle(project, title).elements.find(match)!.position.col;
}

describe("traffic-light-ladder.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("boucle vert, orange, rouge tant que marche est vrai", async () => {
		const scenario = new PlcScenario(createTrafficLightLadderSolution());
		scenario.set("marche", true);
		await scenario.seconds(1);
		expect(scenario.get("vert")).toBe(true);
		await scenario.seconds(5);
		expect(scenario.get("orange")).toBe(true);
		await scenario.seconds(2);
		expect(scenario.get("rouge")).toBe(true);
		await scenario.seconds(5);
		expect(scenario.get("vert")).toBe(true);
		scenario.stop();
	});

	it("marche faux : le cycle en cours se termine et la séquence reste au rouge, puis reprend", async () => {
		const scenario = new PlcScenario(createTrafficLightLadderSolution());
		await scenario.seconds(8);
		expect(scenario.get("rouge")).toBe(true);
		await scenario.seconds(10);
		expect(scenario.get("rouge")).toBe(true);
		expect(scenario.get("vert")).toBe(false);
		scenario.set("marche", true);
		await scenario.seconds(1);
		expect(scenario.get("vert")).toBe(true);
		scenario.stop();
	});

	it("arret réinitialise la séquence sur le vert", async () => {
		const scenario = new PlcScenario(createTrafficLightLadderSolution());
		scenario.set("marche", true);
		await scenario.seconds(6);
		expect(scenario.get("orange")).toBe(true);
		await scenario.press("arret", 2);
		expect(scenario.get("vert")).toBe(true);
		expect(scenario.get("orange")).toBe(false);
		scenario.stop();
	});

	it("marche passe à faux pendant le vert : le cycle se termine au rouge, qui reste allumé jusqu'au retour de marche", async () => {
		const scenario = new PlcScenario(createTrafficLightLadderSolution());
		scenario.set("marche", true);
		await scenario.seconds(2);
		expect(scenario.get("vert")).toBe(true);
		scenario.set("marche", false);
		await scenario.seconds(5);
		expect(scenario.get("orange")).toBe(true);
		await scenario.seconds(2);
		expect(scenario.get("rouge")).toBe(true);
		await scenario.seconds(10);
		expect(scenario.get("rouge")).toBe(true);
		scenario.set("marche", true);
		await scenario.seconds(1);
		expect(scenario.get("vert")).toBe(true);
		expect(scenario.get("rouge")).toBe(false);
		scenario.stop();
	});

	it("chaque TON est dans le réseau de la transition qu'il temporise, juste après l'étape", () => {
		const project = createTrafficLightLadderSolution();
		expect(timerNamesIn(project, "X0 -> X1")).toEqual(["t_vert"]);
		expect(timerNamesIn(project, "X1 -> X2")).toEqual(["t_orange"]);
		expect(timerNamesIn(project, "X2 -> X0")).toEqual(["t_rouge"]);
		const isStep = (e: LadderElement) =>
			e.type === "contact" && e.data.variable === "X2";
		const isTimer = (e: LadderElement) => e.type === "block";
		const isRun = (e: LadderElement) =>
			e.type === "contact" && e.data.variable === "marche";
		const step = xOf(project, "X2 -> X0", isStep);
		const timer = xOf(project, "X2 -> X0", isTimer);
		const run = xOf(project, "X2 -> X0", isRun);
		expect(step).toBeLessThan(timer);
		expect(timer).toBeLessThan(run);
	});

	it("les seuls réseaux qui portent un TON sont les trois transitions", () => {
		const project = createTrafficLightLadderSolution();
		const withTimer = executionSections(project)
			.filter((s) => timerNamesIn(project, s.title).length > 0)
			.map((s) => s.title);
		expect(withTimer).toEqual(["X0 -> X1", "X1 -> X2", "X2 -> X0"]);
	});

	it("l'énoncé fournit Cycle_automatique et Sorties vides, appelés par le Main dans cet ordre", () => {
		const project = createTrafficLightLadderProject();
		const programs = calledPrograms(project);
		expect(programs.map((p) => p.name)).toEqual([
			"Cycle_automatique",
			"Sorties",
		]);
		expect(programs.every((p) => p.isEmpty())).toBe(true);
	});

	it("la réinitialisation est le dernier réseau de Cycle_automatique, avant tout réseau de Sorties", () => {
		const titles = executionSections(createTrafficLightLadderSolution()).map(
			(s) => s.title,
		);
		expect(titles.indexOf("Réinitialisation : étape initiale")).toBe(
			titles.indexOf("Sortie vert") - 1,
		);
	});
});
