import PlcScenario from "@tests/utils/plc-scenario";
import {
	PACKING_PRESET,
	createLadderPackingProject,
	createLadderPackingSolution,
} from "./ladder-packing.template";

async function pieces(scenario: PlcScenario, count: number) {
	for (let i = 0; i < count; i++) {
		await scenario.press("capteur_piece", 1);
		scenario.release("capteur_piece");
		await scenario.cycles(1);
	}
}

describe("ladder-packing.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé ne fournit aucune variable", () => {
		expect(createLadderPackingProject().variables).toHaveLength(0);
	});

	it("cycle complet : arrêt à la présélection, changement de caisse, redémarrage automatique", async () => {
		const scenario = new PlcScenario(createLadderPackingSolution());
		await scenario.cycles();
		await scenario.tap("marche");
		await scenario.cycles(2);
		expect(scenario.get("convoyeur")).toBe(true);

		await pieces(scenario, PACKING_PRESET);
		await scenario.cycles(2);
		expect(scenario.get("convoyeur")).toBe(false);

		await scenario.seconds(6);
		expect(scenario.get("convoyeur")).toBe(true);
		expect(scenario.get("cpt_pieces.CV")).toBe(0);
		scenario.stop();
	});

	it("voyant de défaut : clignotant, fixe une fois acquitté, éteint quand le défaut disparaît", async () => {
		const scenario = new PlcScenario(createLadderPackingSolution());
		await scenario.cycles();
		await scenario.tap("marche");
		await scenario.cycles(2);

		await scenario.press("thermique", 2);
		expect(scenario.get("convoyeur")).toBe(false);
		const blinking: boolean[] = [];
		for (let i = 0; i < 30; i++) {
			await scenario.cycles(1);
			blinking.push(scenario.get("voyant_defaut") as boolean);
		}
		expect(blinking).toContain(true);
		expect(blinking).toContain(false);

		await scenario.tap("acquit", 2);
		await scenario.cycles(6);
		expect(scenario.get("voyant_defaut")).toBe(true);

		scenario.release("thermique");
		await scenario.cycles(3);
		expect(scenario.get("voyant_defaut")).toBe(false);
		expect(scenario.get("convoyeur")).toBe(false);

		await scenario.tap("marche");
		await scenario.cycles(2);
		expect(scenario.get("convoyeur")).toBe(true);
		scenario.stop();
	});
});
