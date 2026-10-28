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
	it("la séquence de l'énoncé (appuis de 1 à 5 s, de 8 à 9 s et de 9,5 à 12 s) donne les réponses de l'exercice", async () => {
		const scenario = new PlcScenario(createLadderTimersReadingProject());
		let now = 0;
		const goTo = async (seconds: number) => {
			await scenario.seconds(seconds - now);
			now = seconds;
		};
		const state = () => ({
			ton: scenario.get("q_ton"),
			tof: scenario.get("q_tof"),
			tp: scenario.get("q_tp"),
		});
		const expectAt = async (
			seconds: number,
			expected: { ton: boolean; tof: boolean; tp: boolean },
		) => {
			await goTo(seconds);
			expect({ at: seconds, ...state() }).toEqual({ at: seconds, ...expected });
		};

		await expectAt(0.5, { ton: false, tof: false, tp: false });
		scenario.set("bp", true);
		await expectAt(2.5, { ton: false, tof: true, tp: true });
		await expectAt(3.8, { ton: true, tof: true, tp: false });
		await goTo(5);
		scenario.set("bp", false);
		await expectAt(5.8, { ton: false, tof: true, tp: false });
		await expectAt(7.6, { ton: false, tof: false, tp: false });
		await goTo(8);
		scenario.set("bp", true);
		await expectAt(8.6, { ton: false, tof: true, tp: true });
		await goTo(9);
		scenario.set("bp", false);
		await expectAt(9.3, { ton: false, tof: true, tp: true });
		await goTo(9.5);
		scenario.set("bp", true);
		await expectAt(10.6, { ton: false, tof: true, tp: false });
		await expectAt(11.8, { ton: true, tof: true, tp: false });
		await goTo(12);
		scenario.set("bp", false);
		await expectAt(12.6, { ton: false, tof: true, tp: false });
		await expectAt(13.6, { ton: false, tof: true, tp: false });
		await expectAt(14.6, { ton: false, tof: false, tp: false });
		scenario.stop();
	});
});
