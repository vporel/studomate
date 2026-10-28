import * as templates from "./ladder-memory.template";
import type { Locale } from "@/i18n/config";
import Project from "@/schemas/project/project.schema";
import { getInputRestValue } from "@/schemas/variable/input-behavior";
import PlcScenario from "@tests/utils/plc-scenario";
import {
	createLadderMemoryProject,
	createLadderMemorySolution,
} from "./ladder-memory.template";

function restValue(project: Project, name: string) {
	return getInputRestValue(
		project.variables.find((v) => v.mnemonic === name)?.behavior,
	);
}

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

	it("le capteur est câblé à ouverture : vrai au repos", () => {
		const project = createLadderMemoryProject();
		expect(restValue(project, "temperature_ok")).toBe(true);
		expect(restValue(project, "acquit")).toBe(false);
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

describe("ladder-memory.template (langues)", () => {
	const builders: [(locale?: Locale) => Project, string, string][] = [
		[
			templates.createLadderMemoryProject,
			"Pompe : défaut mémorisé",
			"Pump: stored fault",
		],
		[
			templates.createLadderMemorySolution,
			"Pompe : défaut mémorisé : solution",
			"Pump: stored fault: solution",
		],
	];

	it.each(builders)("garde le nom français en fr (%#)", (build, fr) => {
		expect(build().name).toBe(fr);
		expect(build("fr").name).toBe(fr);
	});

	it.each(builders)(
		"nomme le projet en anglais, sans accent (%#)",
		(build, _fr, en) => {
			const project = build("en");
			expect(project.name).toBe(en);
			const titles = Object.values(project.ladders)
				.flatMap((ladder) => [
					ladder.name,
					...ladder.sections.map((s) => s.title),
				])
				.join(" ");
			expect(titles).not.toMatch(/[À-ÿ]/);
		},
	);
});
