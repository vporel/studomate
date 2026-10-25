import { calledPrograms } from "@tests/utils/execution-sections";
import PlcScenario from "@tests/utils/plc-scenario";
import {
	createOrDivergenceLadderProject,
	createOrDivergenceLadderSolution,
} from "./or-divergence-ladder.template";

describe("or-divergence-ladder.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé fournit Cycle_automatique et Sorties vides, le corrigé les remplit", () => {
		const exercise = calledPrograms(createOrDivergenceLadderProject());
		expect(exercise.map((p) => p.name)).toEqual([
			"Cycle_automatique",
			"Sorties",
		]);
		expect(exercise.every((p) => p.isEmpty())).toBe(true);
		const solution = calledPrograms(createOrDivergenceLadderSolution());
		expect(solution.map((p) => p.sections.length)).toEqual([5, 2]);
	});

	it.each([
		["dcy1", "fin1", "sortie1", "sortie2"],
		["dcy2", "fin2", "sortie2", "sortie1"],
	])(
		"la branche déclenchée par %s active %s puis revient à l'état initial",
		async (start, end, on, off) => {
			const scenario = new PlcScenario(createOrDivergenceLadderSolution());
			await scenario.cycles(2);
			await scenario.tap(start, 1);
			await scenario.cycles(1);
			expect(scenario.get(on)).toBe(true);
			expect(scenario.get(off)).toBe(false);
			scenario.set(end, true);
			await scenario.cycles(2);
			expect(scenario.get(on)).toBe(false);
			expect(scenario.get("X0")).toBe(true);
			scenario.stop();
		},
	);

	it("deux réceptivités vraies ensemble : seule la première branche écrite est franchie", async () => {
		const scenario = new PlcScenario(createOrDivergenceLadderSolution());
		await scenario.cycles(2);
		await scenario.press("dcy1");
		await scenario.press("dcy2", 2);
		expect(scenario.get("sortie1")).toBe(true);
		expect(scenario.get("sortie2")).toBe(false);
		scenario.stop();
	});
});
