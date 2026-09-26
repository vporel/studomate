import PlcScenario from "@tests/utils/plc-scenario";
import { createLadderTimersSolution } from "./ladder-timers.template";

describe("ladder-timers.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("étoile puis triangle après PT, jamais les deux ensemble", async () => {
		const scenario = new PlcScenario(createLadderTimersSolution());
		await scenario.cycles();
		await scenario.tap("marche");
		let overlap = false;
		let sawStar = false;
		for (let i = 0; i < 70; i++) {
			await scenario.cycles(1);
			if (scenario.get("km_etoile") && scenario.get("km_triangle")) overlap = true;
			if (scenario.get("km_etoile")) sawStar = true;
		}
		expect(overlap).toBe(false);
		expect(sawStar).toBe(true);
		expect(scenario.get("km_ligne")).toBe(true);
		expect(scenario.get("km_etoile")).toBe(false);
		expect(scenario.get("km_triangle")).toBe(true);
		scenario.stop();
	});

	it("le ventilateur continue 10 s après l'arrêt", async () => {
		const scenario = new PlcScenario(createLadderTimersSolution());
		await scenario.tap("marche");
		await scenario.seconds(1);
		expect(scenario.get("ventilateur")).toBe(true);
		await scenario.press("arret", 2);
		expect(scenario.get("km_ligne")).toBe(false);
		await scenario.seconds(8);
		expect(scenario.get("ventilateur")).toBe(true);
		await scenario.seconds(3);
		expect(scenario.get("ventilateur")).toBe(false);
		scenario.stop();
	});

	it("le clignotant alterne à 1 s quand l'interrupteur est actionné", async () => {
		const scenario = new PlcScenario(createLadderTimersSolution());
		await scenario.cycles();
		expect(scenario.get("voyant")).toBe(false);
		await scenario.press("inter_clignotant");
		const samples: boolean[] = [];
		for (let i = 0; i < 50; i++) {
			await scenario.cycles(1);
			samples.push(scenario.get("voyant") as boolean);
		}
		expect(samples).toContain(true);
		expect(samples).toContain(false);
		scenario.release("inter_clignotant");
		await scenario.seconds(3);
		expect(scenario.get("voyant")).toBe(false);
		scenario.stop();
	});
});
