import Project from "@/schemas/project/project.schema";
import { getInputRestValue } from "@/schemas/variable/input-behavior";
import PlcScenario from "@tests/utils/plc-scenario";
import {
	createLadderSelfHoldingProject,
	createLadderSelfHoldingSolution,
} from "./ladder-self-holding.template";

function restValue(project: Project, name: string) {
	return getInputRestValue(
		project.variables.find((v) => v.mnemonic === name)?.behavior,
	);
}

describe("ladder-self-holding.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé fournit deux boutons poussoirs câblés NO, à 0 au repos, et un Main vide", () => {
		const project = createLadderSelfHoldingProject();
		expect(restValue(project, "marche")).toBe(false);
		expect(restValue(project, "arret")).toBe(false);
		expect(project.main.sections[0].elements).toHaveLength(0);
	});

	it("marche et arret pressés ensemble depuis le repos laissent la pompe éteinte", async () => {
		const scenario = new PlcScenario(createLadderSelfHoldingSolution());
		await scenario.press("marche");
		await scenario.press("arret", 3);
		expect(scenario.get("pompe")).toBe(false);
		scenario.stop();
	});

	it("s'auto-maintient après un appui sur marche", async () => {
		const scenario = new PlcScenario(createLadderSelfHoldingSolution());
		await scenario.cycles();
		expect(scenario.get("pompe")).toBe(false);
		await scenario.tap("marche");
		await scenario.cycles(2);
		expect(scenario.get("pompe")).toBe(true);
		scenario.stop();
	});

	it("s'arrête sur arrêt, qui l'emporte sur un appui simultané sur marche", async () => {
		const scenario = new PlcScenario(createLadderSelfHoldingSolution());
		await scenario.tap("marche");
		await scenario.press("arret", 2);
		expect(scenario.get("pompe")).toBe(false);
		await scenario.press("marche", 2);
		expect(scenario.get("pompe")).toBe(false);
		scenario.stop();
	});
});
