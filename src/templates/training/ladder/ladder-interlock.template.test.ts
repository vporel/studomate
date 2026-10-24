import Project from "@/schemas/project/project.schema";
import { getInputRestValue } from "@/schemas/variable/input-behavior";
import PlcScenario from "@tests/utils/plc-scenario";
import {
	createLadderInterlockProject,
	createLadderInterlockSolution,
} from "./ladder-interlock.template";

function restValue(project: Project, name: string) {
	return getInputRestValue(
		project.variables.find((v) => v.mnemonic === name)?.behavior,
	);
}

describe("ladder-interlock.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé fournit trois boutons poussoirs câblés NO, à 0 au repos", () => {
		const project = createLadderInterlockProject();
		for (const name of ["avant", "arriere", "arret"]) {
			expect(restValue(project, name)).toBe(false);
		}
	});

	it("marche arrière en cours, un appui sur avant est sans effet", async () => {
		const scenario = new PlcScenario(createLadderInterlockSolution());
		await scenario.tap("arriere");
		await scenario.cycles(2);
		await scenario.tap("avant");
		await scenario.cycles(2);
		expect(scenario.get("moteur_ar")).toBe(true);
		expect(scenario.get("moteur_av")).toBe(false);
		scenario.stop();
	});

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
