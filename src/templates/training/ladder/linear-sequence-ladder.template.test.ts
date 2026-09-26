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
		expect(mnemonics).toEqual(expect.arrayContaining(["dcy", "sortie1", "M0", "M3", "T0", "init"]));
	});

	it("le corrigé déroule la séquence, une seule étape active à la fois", async () => {
		const scenario = new PlcScenario(createLinearSequenceLadderSolution());
		await scenario.cycles(2);
		expect(scenario.get("M0")).toBe(true);
		const activeSteps = () =>
			["M0", "M1", "M2", "M3"].filter((step) => scenario.get(step));

		await scenario.press("dcy", 1);
		scenario.release("dcy");
		await scenario.cycles(1);
		expect(activeSteps()).toEqual(["M1"]);
		expect(scenario.get("sortie1")).toBe(true);

		scenario.set("fin1", true);
		await scenario.cycles(1);
		expect(activeSteps()).toEqual(["M2"]);
		expect(scenario.get("sortie1")).toBe(false);
		expect(scenario.get("sortie2")).toBe(true);
		scenario.set("fin1", false);

		scenario.set("fin2", true);
		await scenario.cycles(1);
		expect(activeSteps()).toEqual(["M3"]);
		await scenario.cycles(1);
		expect(activeSteps()).toEqual(["M0"]);
		scenario.stop();
	});

	it("l'énoncé naïf commande deux sorties ensemble pendant un cycle au franchissement", async () => {
		const scenario = new PlcScenario(createLinearSequenceNaiveLadderProject());
		await scenario.cycles(2);
		await scenario.tap("dcy", 1);
		await scenario.cycles(2);
		expect(scenario.get("M1")).toBe(true);
		expect(scenario.get("M2")).toBe(false);

		scenario.set("fin1", true);
		await scenario.cycles(1);
		expect(scenario.get("sortie1") && scenario.get("sortie2")).toBe(true);
		scenario.set("fin1", false);
		await scenario.cycles(1);
		expect(scenario.get("sortie1")).toBe(false);
		expect(scenario.get("sortie2")).toBe(true);
		scenario.stop();
	});
});
