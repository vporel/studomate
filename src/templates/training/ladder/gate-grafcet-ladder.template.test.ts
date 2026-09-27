import PlcScenario from "@tests/utils/plc-scenario";
import {
	createGateGrafcetLadderProject,
	createGateGrafcetLadderSolution,
} from "./gate-grafcet-ladder.template";

async function closedGate(): Promise<PlcScenario> {
	const scenario = new PlcScenario(createGateGrafcetLadderSolution());
	scenario.set("fc_ferme", true);
	await scenario.cycles(3);
	return scenario;
}

async function press(scenario: PlcScenario) {
	await scenario.tap("telecommande", 3);
	await scenario.cycles(1);
}

describe("gate-grafcet-ladder.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé n'embarque aucun GRAFCET ni programme de commande", () => {
		const project = createGateGrafcetLadderProject();
		expect(project.variables.map((v) => v.mnemonic)).toEqual(
			expect.arrayContaining(["telecommande", "arret", "barriere_immaterielle", "X0"]),
		);
		expect(project.main.sections[0].elements).toHaveLength(0);
	});

	it("un appui ouvre, puis ferme quand le portail est ouvert", async () => {
		const scenario = await closedGate();
		await press(scenario);
		expect(scenario.get("ouvrir")).toBe(true);
		scenario.set("fc_ferme", false);
		scenario.set("fc_ouvert", true);
		await scenario.cycles(3);
		expect(scenario.get("ouvrir")).toBe(false);
		await press(scenario);
		expect(scenario.get("fermer")).toBe(true);
		expect(scenario.get("ouvrir")).toBe(false);
		scenario.stop();
	});

	it("un appui arrête en mouvement, le suivant repart dans le sens inverse", async () => {
		const scenario = await closedGate();
		await press(scenario);
		scenario.set("fc_ferme", false);
		expect(scenario.get("ouvrir")).toBe(true);
		await press(scenario);
		expect(scenario.get("ouvrir")).toBe(false);
		expect(scenario.get("fermer")).toBe(false);
		await press(scenario);
		expect(scenario.get("fermer")).toBe(true);
		await press(scenario);
		expect(scenario.get("fermer")).toBe(false);
		await press(scenario);
		expect(scenario.get("ouvrir")).toBe(true);
		scenario.stop();
	});

	it("le bouton d'arrêt produit le même arrêt", async () => {
		const scenario = await closedGate();
		await press(scenario);
		scenario.set("fc_ferme", false);
		await scenario.press("arret", 2);
		scenario.release("arret");
		await scenario.cycles(2);
		expect(scenario.get("ouvrir")).toBe(false);
		await press(scenario);
		expect(scenario.get("fermer")).toBe(true);
		scenario.stop();
	});

	it("la barrière immatérielle provoque la réouverture en fermeture, jamais les deux sens", async () => {
		const scenario = await closedGate();
		await press(scenario);
		scenario.set("fc_ferme", false);
		scenario.set("fc_ouvert", true);
		await scenario.cycles(3);
		scenario.set("fc_ouvert", false);
		await press(scenario);
		expect(scenario.get("fermer")).toBe(true);
		scenario.set("barriere_immaterielle", true);
		for (let i = 0; i < 3; i++) {
			await scenario.cycles(1);
			expect(scenario.get("ouvrir") && scenario.get("fermer")).toBe(false);
		}
		expect(scenario.get("ouvrir")).toBe(true);
		expect(scenario.get("fermer")).toBe(false);
		scenario.stop();
	});
});
