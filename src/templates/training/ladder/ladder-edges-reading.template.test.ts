import PlcScenario from "@tests/utils/plc-scenario";
import { createLadderEdgesReadingProject } from "./ladder-edges-reading.template";

describe("ladder-edges-reading.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("le contact NO suit le maintien, P et N ne durent qu'un cycle", async () => {
		const scenario = new PlcScenario(createLadderEdgesReadingProject());
		await scenario.cycles();

		await scenario.press("bp", 1);
		expect(scenario.get("s_no")).toBe(true);
		expect(scenario.get("s_p")).toBe(true);
		expect(scenario.get("s_n")).toBe(false);

		await scenario.press("raz", 1);
		scenario.release("raz");
		await scenario.cycles(1);
		expect(scenario.get("s_no")).toBe(true);
		expect(scenario.get("s_p")).toBe(false);

		scenario.release("bp");
		await scenario.cycles(1);
		expect(scenario.get("s_n")).toBe(true);
		scenario.stop();
	});

	it("raz remet les trois sorties à faux", async () => {
		const scenario = new PlcScenario(createLadderEdgesReadingProject());
		await scenario.tap("bp", 2);
		await scenario.tap("raz", 1);
		expect(scenario.get("s_no")).toBe(false);
		expect(scenario.get("s_p")).toBe(false);
		expect(scenario.get("s_n")).toBe(false);
		scenario.stop();
	});
});
