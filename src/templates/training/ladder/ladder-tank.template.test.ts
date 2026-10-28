import PlcScenario from "@tests/utils/plc-scenario";
import {
	createLadderTankProject,
	createLadderTankSolution,
} from "./ladder-tank.template";

describe("ladder-tank.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("hystérésis : la pompe démarre sous 20, s'arrête au-dessus de 80", async () => {
		const scenario = new PlcScenario(createLadderTankSolution());
		scenario.set("niveau", 10);
		await scenario.cycles(2);
		expect(scenario.get("pompe")).toBe(true);
		scenario.set("niveau", 50);
		await scenario.cycles(2);
		expect(scenario.get("pompe")).toBe(true);
		scenario.set("niveau", 90);
		await scenario.cycles(2);
		expect(scenario.get("pompe")).toBe(false);
		scenario.set("niveau", 50);
		await scenario.cycles(2);
		expect(scenario.get("pompe")).toBe(false);
		scenario.stop();
	});

	it("alarme au-dessus de 95", async () => {
		const scenario = new PlcScenario(createLadderTankSolution());
		scenario.set("niveau", 96);
		await scenario.cycles(2);
		expect(scenario.get("alarme")).toBe(true);
		scenario.set("niveau", 50);
		await scenario.cycles(2);
		expect(scenario.get("alarme")).toBe(false);
		scenario.stop();
	});

	it("le corrigé compte un démarrage, l'énoncé incrémente à chaque cycle pompe en marche", async () => {
		const solution = new PlcScenario(createLadderTankSolution());
		solution.set("niveau", 10);
		await solution.cycles(6);
		expect(solution.get("nb_demarrages")).toBe(1);
		solution.stop();

		const statement = new PlcScenario(createLadderTankProject());
		statement.plc.setOutputImageValueById(
			statement.plc
				.getVariablesSnapshot()
				.find((v) => v.getName() === "pompe")!
				.getId(),
			true,
		);
		await statement.cycles(5);
		expect(statement.get("nb_demarrages") as number).toBeGreaterThan(1);
		statement.stop();
	});

	it("le déroulé de l'énoncé : 15 allume la pompe, 50 la garde, 85 l'éteint, 50 la garde éteinte, 96 allume l'alarme", async () => {
		const scenario = new PlcScenario(createLadderTankSolution());
		for (const [niveau, pompe, alarme] of [
			[15, true, false],
			[50, true, false],
			[85, false, false],
			[50, false, false],
			[96, false, true],
		] as const) {
			scenario.set("niveau", niveau);
			await scenario.cycles(2);
			expect({ niveau, pompe: scenario.get("pompe") }).toEqual({
				niveau,
				pompe,
			});
			expect(scenario.get("alarme")).toBe(alarme);
		}
		scenario.stop();
	});

	it("chaque démarrage de la pompe ajoute exactement 1 à nb_demarrages", async () => {
		const scenario = new PlcScenario(createLadderTankSolution());
		for (let start = 1; start <= 3; start++) {
			scenario.set("niveau", 15);
			await scenario.cycles(4);
			scenario.set("niveau", 50);
			await scenario.cycles(4);
			scenario.set("niveau", 85);
			await scenario.cycles(4);
			expect(scenario.get("nb_demarrages")).toBe(start);
		}
		scenario.stop();
	});
});
