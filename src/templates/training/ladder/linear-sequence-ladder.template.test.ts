import PlcScenario from "@tests/utils/plc-scenario";
import {
	calledPrograms,
	executionSections,
} from "@tests/utils/execution-sections";
import {
	createLinearSequenceLadderProject,
	createLinearSequenceLadderSolution,
	createLinearSequenceNaiveLadderProject,
} from "./linear-sequence-ladder.template";

describe("linear-sequence-ladder.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé fournit les variables de linear-sequence et les mémoires d'étape", () => {
		const mnemonics = createLinearSequenceLadderProject().variables.map(
			(v) => v.mnemonic,
		);
		expect(mnemonics).toEqual(
			expect.arrayContaining(["dcy", "sortie1", "X0", "X3"]),
		);
		expect(mnemonics.filter((name) => /^T\d+$/.test(name))).toEqual([]);
		expect(mnemonics).not.toContain("init");
	});

	it("le corrigé déroule la séquence, une seule étape active à la fois, X3 étant franchie aussitôt", async () => {
		const scenario = new PlcScenario(createLinearSequenceLadderSolution());
		await scenario.cycles(2);
		expect(scenario.get("X0")).toBe(true);
		const activeSteps = () =>
			["X0", "X1", "X2", "X3"].filter((step) => scenario.get(step));

		await scenario.press("dcy", 1);
		scenario.release("dcy");
		await scenario.cycles(1);
		expect(activeSteps()).toEqual(["X1"]);
		expect(scenario.get("sortie1")).toBe(true);

		scenario.set("fin1", true);
		await scenario.cycles(1);
		expect(activeSteps()).toEqual(["X2"]);
		expect(scenario.get("sortie1")).toBe(false);
		expect(scenario.get("sortie2")).toBe(true);
		scenario.set("fin1", false);

		scenario.set("fin2", true);
		await scenario.cycles(1);
		expect(activeSteps()).toEqual(["X0"]);
		scenario.stop();
	});

	it("le corrigé compte 7 réseaux : 1 d'initialisation, 4 de transition, 2 de sortie", () => {
		const titles = executionSections(createLinearSequenceLadderSolution()).map(
			(section) => section.title,
		);
		expect(titles).toHaveLength(7);
		expect(titles).toEqual(
			expect.arrayContaining(["X0 -> X1", "X1 -> X2", "X2 -> X3", "X3 -> X0"]),
		);
	});

	it("le corrigé range l'initialisation et les transitions dans Cycle_automatique, les sorties dans Sorties", () => {
		const [cycle, outputs] = calledPrograms(
			createLinearSequenceLadderSolution(),
		);
		expect(cycle.name).toBe("Cycle_automatique");
		expect(cycle.sections.map((s) => s.title)).toEqual([
			"Activation de l'étape initiale",
			"X0 -> X1",
			"X1 -> X2",
			"X2 -> X3",
			"X3 -> X0",
		]);
		expect(outputs.name).toBe("Sorties");
		expect(outputs.sections.map((s) => s.title)).toEqual([
			"Sortie sortie1",
			"Sortie sortie2",
		]);
	});

	it("l'énoncé fournit les deux programmes vides, appelés par le Main sans réseau vide en tête", () => {
		const project = createLinearSequenceLadderProject();
		expect(calledPrograms(project).map((p) => p.name)).toEqual([
			"Cycle_automatique",
			"Sorties",
		]);
		expect(calledPrograms(project).every((p) => p.isEmpty())).toBe(true);
		expect(project.main.sections).toHaveLength(2);
		expect(project.main.sections.every((s) => !s.isEmpty())).toBe(true);
	});

	it("l'énoncé naïf commande deux sorties ensemble pendant un cycle au franchissement", async () => {
		const scenario = new PlcScenario(createLinearSequenceNaiveLadderProject());
		await scenario.cycles(2);
		await scenario.tap("dcy", 1);
		await scenario.cycles(2);
		expect(scenario.get("X1")).toBe(true);
		expect(scenario.get("X2")).toBe(false);

		scenario.set("fin1", true);
		await scenario.cycles(1);
		expect(scenario.get("sortie1") && scenario.get("sortie2")).toBe(true);
		scenario.set("fin1", false);
		await scenario.cycles(1);
		expect(scenario.get("sortie1")).toBe(false);
		expect(scenario.get("sortie2")).toBe(true);
		scenario.stop();
	});

	it("l'énoncé naïf franchit deux transitions dans le même cycle quand dcy et fin1 sont vraies ensemble", async () => {
		const scenario = new PlcScenario(createLinearSequenceNaiveLadderProject());
		await scenario.cycles(2);
		const activeSteps = () =>
			["X0", "X1", "X2", "X3"].filter((step) => scenario.get(step));

		scenario.set("dcy", true);
		scenario.set("fin1", true);
		await scenario.cycles(1);
		expect(activeSteps()).toEqual(["X0", "X1", "X2"]);
		await scenario.cycles(1);
		expect(activeSteps()).toEqual(["X2"]);
		scenario.stop();
	});

	it("le corrigé enchaîne deux transitions consécutives dans le même cycle quand dcy et fin1 sont vraies ensemble", async () => {
		const scenario = new PlcScenario(createLinearSequenceLadderSolution());
		await scenario.cycles(2);
		const activeSteps = () =>
			["X0", "X1", "X2", "X3"].filter((step) => scenario.get(step));

		scenario.set("dcy", true);
		scenario.set("fin1", true);
		await scenario.cycles(1);
		expect(activeSteps()).toEqual(["X2"]);
		scenario.stop();
	});

	it("l'énoncé naïf montre le GRAFCET implémenté, exclu de l'exécution", () => {
		const grafcets = Object.values(
			createLinearSequenceNaiveLadderProject().grafcets,
		);
		expect(grafcets).toHaveLength(1);
		expect(grafcets[0].excludedFromExecution).toBe(true);
	});
});
