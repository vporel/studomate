import * as templates from "./and-divergence-ladder.template";
import type { Locale } from "@/i18n/config";
import type Project from "@/schemas/project/project.schema";
import PlcScenario from "@tests/utils/plc-scenario";
import { createAndDivergenceLadderSolution } from "./and-divergence-ladder.template";

describe("and-divergence-ladder.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("active les deux branches ensemble et attend les deux capteurs pour converger", async () => {
		const scenario = new PlcScenario(createAndDivergenceLadderSolution());
		await scenario.cycles(2);
		await scenario.tap("dcy", 1);
		await scenario.cycles(1);
		expect(scenario.get("sortie1")).toBe(true);
		expect(scenario.get("sortie2")).toBe(true);

		scenario.set("capteur1", true);
		await scenario.cycles(3);
		expect(scenario.get("sortie1")).toBe(true);
		expect(scenario.get("X0")).toBe(false);

		scenario.set("capteur2", true);
		await scenario.cycles(2);
		expect(scenario.get("sortie1")).toBe(false);
		expect(scenario.get("sortie2")).toBe(false);
		expect(scenario.get("X0")).toBe(true);
		scenario.stop();
	});
});

describe("and-divergence-ladder.template (langues)", () => {
	const builders: [(locale?: Locale) => Project, string, string][] = [
		[
			templates.createAndDivergenceLadderProject,
			"Divergence en ET en Ladder",
			"AND divergence in Ladder",
		],
		[
			templates.createAndDivergenceLadderSolution,
			"Divergence en ET en Ladder : solution",
			"AND divergence in Ladder: solution",
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
