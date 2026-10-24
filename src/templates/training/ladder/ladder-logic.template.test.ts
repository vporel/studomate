import * as templates from "./ladder-logic.template";
import type { Locale } from "@/i18n/config";
import type Project from "@/schemas/project/project.schema";
import PlcScenario from "@tests/utils/plc-scenario";
import {
	createLadderLogicProject,
	createLadderLogicSolution,
} from "./ladder-logic.template";

describe("ladder-logic.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé ne fournit que les variables", () => {
		expect(createLadderLogicProject().main.sections[0].elements).toHaveLength(
			0,
		);
	});

	it.each([
		[false, false, true, false],
		[true, false, true, true],
		[false, true, true, true],
		[true, true, true, false],
		[true, false, false, false],
	])(
		"inter1=%s inter2=%s validation=%s : lampe=%s",
		async (i1, i2, validation, lampe) => {
			const scenario = new PlcScenario(createLadderLogicSolution());
			scenario.set("inter1", i1);
			scenario.set("inter2", i2);
			scenario.set("validation", validation);
			await scenario.cycles();
			expect(scenario.get("lampe")).toBe(lampe);
			scenario.stop();
		},
	);
});

describe("ladder-logic.template (langues)", () => {
	const builders: [(locale?: Locale) => Project, string, string][] = [
		[
			templates.createLadderLogicProject,
			"Éclairage en va-et-vient",
			"Two-way lighting",
		],
		[
			templates.createLadderLogicSolution,
			"Éclairage en va-et-vient : solution",
			"Two-way lighting: solution",
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
