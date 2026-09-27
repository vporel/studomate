import PlcScenario from "@tests/utils/plc-scenario";
import {
	createLinearSequenceLadderProject,
	createLinearSequenceLadderSolution,
	createLinearSequenceNaiveLadderProject,
} from "./linear-sequence-ladder.template";

describe("linear-sequence-ladder.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé fournit les variables de linear-sequence et les mémoires d'étape", () => {
		const mnemonics = createLinearSequenceLadderProject().variables.map((v) => v.mnemonic);
		expect(mnemonics).toEqual(expect.arrayContaining(["dcy", "sortie1", "X0", "X3", "T0", "init"]));
	});

	it("le corrigé déroule la séquence, une seule étape active à la fois", async () => {
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
		expect(activeSteps()).toEqual(["X3"]);
		await scenario.cycles(1);
		expect(activeSteps()).toEqual(["X0"]);
		scenario.stop();
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

	it("l'énoncé naïf montre le GRAFCET implémenté, exclu de l'exécution", () => {
		const grafcets = Object.values(createLinearSequenceNaiveLadderProject().grafcets);
		expect(grafcets).toHaveLength(1);
		expect(grafcets[0].excludedFromExecution).toBe(true);
	});
});
