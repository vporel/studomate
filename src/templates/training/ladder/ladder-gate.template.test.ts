import Project from "@/schemas/project/project.schema";
import { getInputRestValue } from "@/schemas/variable/input-behavior";
import PlcScenario from "@tests/utils/plc-scenario";
import {
	createLadderGateProject,
	createLadderGateSolution,
} from "./ladder-gate.template";

async function startedGate(): Promise<PlcScenario> {
	const scenario = new PlcScenario(createLadderGateSolution());
	await scenario.cycles();
	return scenario;
}

function restValue(project: Project, name: string) {
	return getInputRestValue(
		project.variables.find((v) => v.mnemonic === name)?.behavior,
	);
}

describe("ladder-gate.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé ne déclare que les sorties", () => {
		expect(createLadderGateProject().variables.map((v) => v.mnemonic)).toEqual([
			"ouvrir",
			"fermer",
		]);
	});

	it("le corrigé déclare les six entrées du cahier des charges, l'arrêt câblé à ouverture", () => {
		const project = createLadderGateSolution();
		const names = project.variables.map((v) => v.mnemonic);
		expect(names).toEqual(
			expect.arrayContaining([
				"bp_ouvrir",
				"bp_fermer",
				"arret",
				"fc_ouvert",
				"fc_ferme",
				"barriere_immaterielle",
			]),
		);
		expect(restValue(project, "arret")).toBe(true);
		expect(restValue(project, "bp_ouvrir")).toBe(false);
		expect(restValue(project, "bp_fermer")).toBe(false);
	});

	it("ignore la barrière immatérielle pendant l'ouverture", async () => {
		const scenario = await startedGate();
		await scenario.tap("bp_ouvrir");
		await scenario.cycles(2);
		scenario.set("barriere_immaterielle", true);
		await scenario.cycles(3);
		expect(scenario.get("ouvrir")).toBe(true);
		expect(scenario.get("fermer")).toBe(false);
		scenario.stop();
	});

	it("ouvre sur bp_ouvrir et s'arrête au fin de course ouvert", async () => {
		const scenario = await startedGate();
		await scenario.tap("bp_ouvrir");
		await scenario.cycles(2);
		expect(scenario.get("ouvrir")).toBe(true);
		expect(scenario.get("fermer")).toBe(false);
		scenario.set("fc_ouvert", true);
		await scenario.cycles(2);
		expect(scenario.get("ouvrir")).toBe(false);
		scenario.stop();
	});

	it("ferme sur bp_fermer et s'arrête au fin de course fermé", async () => {
		const scenario = await startedGate();
		await scenario.tap("bp_fermer");
		await scenario.cycles(2);
		expect(scenario.get("fermer")).toBe(true);
		scenario.set("fc_ferme", true);
		await scenario.cycles(2);
		expect(scenario.get("fermer")).toBe(false);
		scenario.stop();
	});

	it("refuse la fermeture pendant l'ouverture", async () => {
		const scenario = await startedGate();
		await scenario.tap("bp_ouvrir");
		await scenario.tap("bp_fermer");
		await scenario.cycles(2);
		expect(scenario.get("ouvrir")).toBe(true);
		expect(scenario.get("fermer")).toBe(false);
		scenario.stop();
	});

	it("s'arrête sur le bouton d'arrêt", async () => {
		const scenario = await startedGate();
		await scenario.tap("bp_ouvrir");
		await scenario.press("arret", 2);
		expect(scenario.get("ouvrir")).toBe(false);
		expect(scenario.get("fermer")).toBe(false);
		scenario.stop();
	});

	it("se rouvre quand la barrière immatérielle est coupée pendant la fermeture, jamais les deux sens", async () => {
		const scenario = await startedGate();
		await scenario.tap("bp_fermer");
		await scenario.cycles(2);
		scenario.set("barriere_immaterielle", true);
		await scenario.cycles(3);
		expect(scenario.get("fermer")).toBe(false);
		expect(scenario.get("ouvrir")).toBe(true);
		scenario.stop();
	});

	it("ignore la barrière immatérielle quand le portail ne se ferme pas", async () => {
		const scenario = await startedGate();
		scenario.set("barriere_immaterielle", true);
		await scenario.cycles(3);
		expect(scenario.get("ouvrir")).toBe(false);
		scenario.stop();
	});
});
