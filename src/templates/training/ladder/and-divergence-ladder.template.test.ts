import PlcScenario from "@tests/utils/plc-scenario";
import { createAndDivergenceLadderSolution } from "./and-divergence-ladder.template";

describe("and-divergence-ladder.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("active les deux branches ensemble et attend les deux capteurs pour converger", async () => {
		const scenario = new PlcScenario(createAndDivergenceLadderSolution());
		await scenario.cycles(2);
		await scenario.tap("dcy", 1);
		await scenario.cycles(1);
		expect(scenario.get("sortie1")).toBe(true);
		expect(scenario.get("sortie2")).toBe(true);

		scenario.set("capteur1", true);
		await scenario.cycles(3);
		expect(scenario.get("sortie1")).toBe(true);
		expect(scenario.get("X0")).toBe(false);

		scenario.set("capteur2", true);
		await scenario.cycles(2);
		expect(scenario.get("sortie1")).toBe(false);
		expect(scenario.get("sortie2")).toBe(false);
		expect(scenario.get("X0")).toBe(true);
		scenario.stop();
	});
});
