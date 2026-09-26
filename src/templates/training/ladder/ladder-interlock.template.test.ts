import PlcScenario from "@tests/utils/plc-scenario";
import { createLadderInterlockSolution } from "./ladder-interlock.template";

describe("ladder-interlock.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("ne commande jamais les deux sens à la fois", async () => {
		const scenario = new PlcScenario(createLadderInterlockSolution());
		await scenario.tap("avant");
		await scenario.cycles(2);
		expect(scenario.get("moteur_av")).toBe(true);
		await scenario.tap("arriere");
		await scenario.cycles(2);
		expect(scenario.get("moteur_av")).toBe(true);
		expect(scenario.get("moteur_ar")).toBe(false);
		scenario.stop();
	});

	it("l'arrêt commun coupe le sens en cours puis autorise l'autre", async () => {
		const scenario = new PlcScenario(createLadderInterlockSolution());
		await scenario.tap("avant");
		await scenario.press("arret", 2);
		scenario.release("arret");
		await scenario.cycles(2);
		expect(scenario.get("moteur_av")).toBe(false);
		await scenario.tap("arriere");
		await scenario.cycles(2);
		expect(scenario.get("moteur_ar")).toBe(true);
		scenario.stop();
	});
});
