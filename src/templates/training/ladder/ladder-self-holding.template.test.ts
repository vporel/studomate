import PlcScenario from "@tests/utils/plc-scenario";
import { createLadderSelfHoldingSolution } from "./ladder-self-holding.template";

describe("ladder-self-holding.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("s'auto-maintient après un appui sur marche", async () => {
		const scenario = new PlcScenario(createLadderSelfHoldingSolution());
		await scenario.cycles();
		expect(scenario.get("pompe")).toBe(false);
		await scenario.tap("marche");
		await scenario.cycles(2);
		expect(scenario.get("pompe")).toBe(true);
		scenario.stop();
	});

	it("s'arrête sur arrêt, qui l'emporte sur un appui simultané sur marche", async () => {
		const scenario = new PlcScenario(createLadderSelfHoldingSolution());
		await scenario.tap("marche");
		await scenario.press("arret", 2);
		expect(scenario.get("pompe")).toBe(false);
		await scenario.press("marche", 2);
		expect(scenario.get("pompe")).toBe(false);
		scenario.stop();
	});
});
