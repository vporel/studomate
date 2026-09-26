import PlcScenario from "@tests/utils/plc-scenario";
import {
	createLadderToggleProject,
	createLadderToggleSolution,
} from "./ladder-toggle.template";

describe("ladder-toggle.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé naïf ne s'allume jamais", async () => {
		const scenario = new PlcScenario(createLadderToggleProject());
		await scenario.press("bp", 3);
		expect(scenario.get("lampe")).toBe(false);
		scenario.release("bp");
		await scenario.cycles(2);
		expect(scenario.get("lampe")).toBe(false);
		scenario.stop();
	});

	it("le corrigé bascule une fois par appui, même bouton maintenu plusieurs cycles", async () => {
		const scenario = new PlcScenario(createLadderToggleSolution());
		await scenario.press("bp", 4);
		expect(scenario.get("lampe")).toBe(true);
		scenario.release("bp");
		await scenario.cycles(2);
		expect(scenario.get("lampe")).toBe(true);

		await scenario.press("bp", 4);
		expect(scenario.get("lampe")).toBe(false);
		scenario.release("bp");
		await scenario.cycles(2);
		expect(scenario.get("lampe")).toBe(false);
		scenario.stop();
	});
});
