import { calledPrograms } from "@tests/utils/execution-sections";
import PlcScenario from "@tests/utils/plc-scenario";
import { createGateGrafcetLadderProject } from "./gate-grafcet-ladder.template";

async function closedGate(): Promise<PlcScenario> {
	const scenario = new PlcScenario(createGateGrafcetLadderProject());
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

	it("range les blocs de franchissement et d'évolution dans Cycle_automatique, les sorties dans Sorties", () => {
		const [cycle, outputs] = calledPrograms(createGateGrafcetLadderProject());
		expect([cycle.name, outputs.name]).toEqual([
			"Cycle_automatique",
			"Sorties",
		]);
		expect(cycle.sections.map((s) => s.title)).toEqual(
			expect.arrayContaining([
				"Condition de franchissement T0",
				"Désactivation par T0",
				"Activation par T0",
			]),
		);
		expect(outputs.sections).toHaveLength(2);
	});

	it("déclare les six étapes et les neuf transitions, sans doublon", () => {
		const names = createGateGrafcetLadderProject().variables.map(
			(v) => v.mnemonic,
		);
		expect(names.filter((n) => /^X\d+$/.test(n))).toHaveLength(6);
		expect(names.filter((n) => /^T\d+$/.test(n))).toHaveLength(9);
		expect(names).not.toContain("init");
		expect(new Set(names).size).toBe(names.length);
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

	it("la barrière immatérielle est ignorée en ouverture et à l'arrêt", async () => {
		const scenario = await closedGate();
		scenario.set("barriere_immaterielle", true);
		await scenario.cycles(3);
		expect(scenario.get("ouvrir")).toBe(false);
		expect(scenario.get("fermer")).toBe(false);

		scenario.set("barriere_immaterielle", false);
		await press(scenario);
		scenario.set("fc_ferme", false);
		scenario.set("barriere_immaterielle", true);
		await scenario.cycles(3);
		expect(scenario.get("ouvrir")).toBe(true);
		expect(scenario.get("fermer")).toBe(false);

		scenario.set("barriere_immaterielle", false);
		await press(scenario);
		scenario.set("barriere_immaterielle", true);
		await scenario.cycles(3);
		expect(scenario.get("ouvrir")).toBe(false);
		expect(scenario.get("fermer")).toBe(false);
		scenario.stop();
	});
});

describe("gate-grafcet-ladder.template (langues)", () => {
	it("garde le nom français en fr", () => {
		expect(createGateGrafcetLadderProject().name).toBe(
			"Portail à télécommande : trois blocs",
		);
	});

	it("nomme le projet en anglais, sans accent", () => {
		const project = createGateGrafcetLadderProject("en");
		expect(project.name).toBe("Remote-controlled gate: three blocks");
		const titles = Object.values(project.ladders)
			.flatMap((ladder) => [
				ladder.name,
				...ladder.sections.map((s) => s.title),
			])
			.join(" ");
		expect(titles).not.toMatch(/[À-ÿ]/);
	});
});
