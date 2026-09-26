import PlcScenario from "@tests/utils/plc-scenario";
import { CAPACITE } from "@/templates/parking.template";
import {
	createParkingLadderProject,
	createParkingLadderSolution,
} from "./parking-ladder.template";

async function enter(scenario: PlcScenario) {
	await scenario.tap("dem_entree", 1);
	await scenario.cycles(2);
	await scenario.press("passage", 2);
	scenario.release("passage");
	await scenario.cycles(3);
}

describe("parking-ladder.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé fournit la signalisation déjà implantée, appelée par le Main", () => {
		const project = createParkingLadderProject();
		expect(project.main.sections).toHaveLength(1);
		expect(Object.values(project.programs).some((p) => p.name === "Signalisation")).toBe(true);
	});

	it("une seule unité ajoutée par passage, même passage maintenu plusieurs cycles", async () => {
		const scenario = new PlcScenario(createParkingLadderSolution());
		await scenario.cycles(3);
		await enter(scenario);
		expect(scenario.get("places")).toBe(1);
		expect(scenario.get("M0")).toBe(true);
		scenario.stop();
	});

	it("une seule unité retirée par sortie, refusée quand le parking est vide", async () => {
		const scenario = new PlcScenario(createParkingLadderSolution());
		await scenario.cycles(3);
		await scenario.tap("dem_sortie", 1);
		await scenario.cycles(3);
		expect(scenario.get("places")).toBe(0);
		expect(scenario.get("barriere")).toBe(false);

		await enter(scenario);
		await scenario.tap("dem_sortie", 1);
		await scenario.cycles(2);
		await scenario.press("passage", 2);
		scenario.release("passage");
		await scenario.cycles(3);
		expect(scenario.get("places")).toBe(0);
		scenario.stop();
	});

	it("refuse l'entrée quand le parking est complet et allume complet", async () => {
		const scenario = new PlcScenario(createParkingLadderSolution());
		await scenario.cycles(3);
		for (let i = 0; i < CAPACITE; i++) await enter(scenario);
		expect(scenario.get("places")).toBe(CAPACITE);
		expect(scenario.get("complet")).toBe(true);
		await scenario.tap("dem_entree", 1);
		await scenario.cycles(3);
		expect(scenario.get("barriere")).toBe(false);
		expect(scenario.get("places")).toBe(CAPACITE);
		scenario.stop();
	});

	it("arret réinitialise la commande sans remettre le compteur de places à zéro", async () => {
		const scenario = new PlcScenario(createParkingLadderSolution());
		await scenario.cycles(3);
		await enter(scenario);
		await scenario.tap("dem_entree", 1);
		await scenario.cycles(2);
		expect(scenario.get("barriere")).toBe(true);
		await scenario.press("arret", 2);
		expect(scenario.get("barriere")).toBe(false);
		expect(scenario.get("M0")).toBe(true);
		expect(scenario.get("places")).toBe(2);
		scenario.stop();
	});
});
