import PlcScenario from "@tests/utils/plc-scenario";
import {
	BUFFER_CAPACITY,
	PIECES_PRESET,
	STOCK_INITIAL,
	createLadderCountersSolution,
} from "./ladder-counters.template";

describe("ladder-counters.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("le convoyeur s'arrête à la présélection, un capteur maintenu ne compte qu'une fois", async () => {
		const scenario = new PlcScenario(createLadderCountersSolution());
		await scenario.cycles();
		expect(scenario.get("convoyeur")).toBe(true);
		await scenario.press("capteur_piece", 4);
		scenario.release("capteur_piece");
		await scenario.cycles(1);
		expect(scenario.get("cpt_pieces.CV")).toBe(1);
		for (let i = 1; i < PIECES_PRESET; i++) {
			await scenario.press("capteur_piece", 1);
			scenario.release("capteur_piece");
			await scenario.cycles(1);
		}
		expect(scenario.get("convoyeur")).toBe(false);
		await scenario.tap("raz", 2);
		expect(scenario.get("convoyeur")).toBe(true);
		scenario.stop();
	});

	it("la zone tampon : plein à la capacité, vide à zéro, entrée et sortie simultanées sans effet", async () => {
		const scenario = new PlcScenario(createLadderCountersSolution());
		await scenario.cycles(2);
		expect(scenario.get("tampon_vide")).toBe(true);
		for (let i = 0; i < BUFFER_CAPACITY; i++) {
			await scenario.press("capteur_entree", 1);
			scenario.release("capteur_entree");
			await scenario.cycles(1);
		}
		expect(scenario.get("tampon_plein")).toBe(true);
		expect(scenario.get("tampon_vide")).toBe(false);

		scenario.set("capteur_entree", true);
		scenario.set("capteur_sortie", true);
		await scenario.cycles(1);
		scenario.set("capteur_entree", false);
		scenario.set("capteur_sortie", false);
		await scenario.cycles(1);
		expect(scenario.get("tampon.CV")).toBe(BUFFER_CAPACITY);

		for (let i = 0; i < BUFFER_CAPACITY; i++) {
			await scenario.press("capteur_sortie", 1);
			scenario.release("capteur_sortie");
			await scenario.cycles(1);
		}
		expect(scenario.get("tampon_vide")).toBe(true);
		scenario.stop();
	});

	it("le stock est chargé par LD puis décompté jusqu'au voyant « stock vide »", async () => {
		const scenario = new PlcScenario(createLadderCountersSolution());
		await scenario.tap("charge_stock", 2);
		expect(scenario.get("stock_vide")).toBe(false);
		for (let i = 0; i < STOCK_INITIAL; i++) {
			await scenario.press("capteur_prelevement", 1);
			scenario.release("capteur_prelevement");
			await scenario.cycles(1);
		}
		expect(scenario.get("stock_vide")).toBe(true);
		scenario.stop();
	});
});
