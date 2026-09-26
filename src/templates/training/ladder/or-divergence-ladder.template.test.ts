import PlcScenario from "@tests/utils/plc-scenario";
import { createOrDivergenceLadderSolution } from "./or-divergence-ladder.template";

describe("or-divergence-ladder.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it.each([
		["dcy1", "fin1", "sortie1", "sortie2"],
		["dcy2", "fin2", "sortie2", "sortie1"],
	])("la branche déclenchée par %s active %s puis revient à l'état initial", async (start, end, on, off) => {
		const scenario = new PlcScenario(createOrDivergenceLadderSolution());
		await scenario.cycles(2);
		await scenario.tap(start, 1);
		await scenario.cycles(1);
		expect(scenario.get(on)).toBe(true);
		expect(scenario.get(off)).toBe(false);
		scenario.set(end, true);
		await scenario.cycles(2);
		expect(scenario.get(on)).toBe(false);
		expect(scenario.get("M0")).toBe(true);
		scenario.stop();
	});

	it("deux réceptivités vraies ensemble activent les deux branches (règle 4)", async () => {
		const scenario = new PlcScenario(createOrDivergenceLadderSolution());
		await scenario.cycles(2);
		await scenario.press("dcy1");
		await scenario.press("dcy2", 2);
		expect(scenario.get("sortie1")).toBe(true);
		expect(scenario.get("sortie2")).toBe(true);
		scenario.stop();
	});
});
