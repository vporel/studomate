import PlcScenario from "@tests/utils/plc-scenario";
import { createLadderTimersReadingProject } from "./ladder-timers-reading.template";

describe("ladder-timers-reading.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("TON, TOF et TP réagissent différemment au même appui", async () => {
		const scenario = new PlcScenario(createLadderTimersReadingProject());
		await scenario.cycles();
		await scenario.press("bp", 5);
		expect(scenario.get("q_ton")).toBe(false);
		expect(scenario.get("q_tof")).toBe(true);
		expect(scenario.get("q_tp")).toBe(true);
		await scenario.seconds(2);
		expect(scenario.get("q_ton")).toBe(true);
		expect(scenario.get("q_tp")).toBe(false);
		scenario.release("bp");
		await scenario.cycles(2);
		expect(scenario.get("q_ton")).toBe(false);
		expect(scenario.get("q_tof")).toBe(true);
		await scenario.seconds(2);
		expect(scenario.get("q_tof")).toBe(false);
		scenario.stop();
	});

	it("le TP va au bout de son impulsion sur un appui plus court que PT, et ignore un second appui", async () => {
		const scenario = new PlcScenario(createLadderTimersReadingProject());
		await scenario.cycles();
		await scenario.tap("bp", 2);
		await scenario.seconds(1);
		expect(scenario.get("q_tp")).toBe(true);
		await scenario.tap("bp", 2);
		await scenario.seconds(1.5);
		expect(scenario.get("q_tp")).toBe(false);
		scenario.stop();
	});
});
