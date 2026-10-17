import PlcScenario from "@tests/utils/plc-scenario";
import {
	createLadderMemoryProject,
	createLadderMemorySolution,
} from "./ladder-memory.template";

describe("ladder-memory.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé fournit la commande de la pompe seule", () => {
		const project = createLadderMemoryProject();
		expect(project.main.sections).toHaveLength(1);
		expect(project.variables.map((v) => v.mnemonic)).toEqual(
			expect.arrayContaining(["temperature_ok", "acquit", "voyant_defaut"]),
		);
	});

	it("un défaut arrête la pompe et se mémorise, sans redémarrage après acquittement", async () => {
		const scenario = new PlcScenario(createLadderMemorySolution());
		await scenario.tap("marche");
		await scenario.cycles(2);
		expect(scenario.get("pompe")).toBe(true);

		await scenario.press("temperature_ok", 2);
		expect(scenario.get("pompe")).toBe(false);
		expect(scenario.get("voyant_defaut")).toBe(true);

		scenario.release("temperature_ok");
		await scenario.cycles(2);
		expect(scenario.get("voyant_defaut")).toBe(true);
		expect(scenario.get("pompe")).toBe(false);

		await scenario.tap("acquit", 2);
		expect(scenario.get("voyant_defaut")).toBe(false);
		expect(scenario.get("pompe")).toBe(false);

		await scenario.tap("marche");
		await scenario.cycles(2);
		expect(scenario.get("pompe")).toBe(true);
		scenario.stop();
	});

	it("l'acquittement est sans effet tant que le défaut persiste", async () => {
		const scenario = new PlcScenario(createLadderMemorySolution());
		await scenario.press("temperature_ok", 2);
		await scenario.tap("acquit", 2);
		expect(scenario.get("voyant_defaut")).toBe(true);
		scenario.stop();
	});
});
