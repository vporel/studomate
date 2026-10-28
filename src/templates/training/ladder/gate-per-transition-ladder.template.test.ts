import { calledPrograms } from "@tests/utils/execution-sections";
import PlcScenario from "@tests/utils/plc-scenario";
import { createGatePerTransitionLadderProject } from "./gate-per-transition-ladder.template";

async function closedGate(): Promise<PlcScenario> {
	const scenario = new PlcScenario(createGatePerTransitionLadderProject());
	scenario.set("fc_ferme", true);
	await scenario.cycles(3);
	return scenario;
}

async function press(scenario: PlcScenario) {
	await scenario.tap("telecommande", 3);
	await scenario.cycles(1);
}

describe("gate-per-transition-ladder.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("range les transitions dans Cycle_automatique et les sorties dans Sorties", () => {
		const [cycle, outputs] = calledPrograms(
			createGatePerTransitionLadderProject(),
		);
		expect([cycle.name, outputs.name]).toEqual([
			"Cycle_automatique",
			"Sorties",
		]);
		expect(cycle.sections.map((s) => s.title)).toContain("X0 -> X1");
		expect(outputs.sections).toHaveLength(2);
	});

	it("declares the six steps and no crossing memory", () => {
		const names = createGatePerTransitionLadderProject().variables.map(
			(v) => v.mnemonic,
		);
		expect(names.filter((n) => /^X\d+$/.test(n))).toHaveLength(6);
		expect(names.filter((n) => /^T\d+$/.test(n))).toEqual([]);
	});

	it("loses the press that should open a closed gate: the steps loop back to X0", async () => {
		const scenario = await closedGate();
		await press(scenario);
		expect(scenario.get("X0")).toBe(true);
		expect(scenario.get("ouvrir")).toBe(false);
		scenario.stop();
	});

	it("stops on X3 for one scan with fermer commanded, then returns to X0 on the next scan", async () => {
		const scenario = await closedGate();
		await scenario.press("telecommande", 1);
		expect(scenario.get("X3")).toBe(true);
		expect(scenario.get("fermer")).toBe(true);
		expect(scenario.get("X0")).toBe(false);
		expect(scenario.get("X1")).toBe(false);
		expect(scenario.get("X4")).toBe(false);
		scenario.release("telecommande");
		await scenario.cycles(1);
		expect(scenario.get("X0")).toBe(true);
		expect(scenario.get("fermer")).toBe(false);
		scenario.stop();
	});
});
