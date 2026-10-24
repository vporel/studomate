import * as templates from "./ladder-and-or.template";
import type { Locale } from "@/i18n/config";
import type Project from "@/schemas/project/project.schema";
import PlcScenario from "@tests/utils/plc-scenario";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";
import { createLadderAndOrProject } from "./ladder-and-or.template";

describe("ladder-and-or.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("fournit deux réseaux, l'un en série et l'autre en parallèle", () => {
		const sections = createLadderAndOrProject().main.sections;
		expect(sections.map((s) => s.title)).toEqual([
			"Contacts en série",
			"Contacts en parallèle",
		]);
	});

	it("passe l'analyse sans erreur", () => {
		const { analysis } = compilePipelineDetailed(createLadderAndOrProject());
		expect(analysis.issues.filter((i) => i.severity === "error")).toHaveLength(
			0,
		);
	});

	it.each([
		[false, false, { s_et: false, s_ou: false }],
		[true, false, { s_et: false, s_ou: true }],
		[false, true, { s_et: false, s_ou: true }],
		[true, true, { s_et: true, s_ou: true }],
	])("a=%s b=%s suit la table de vérité ET / OU", async (a, b, expected) => {
		const scenario = new PlcScenario(createLadderAndOrProject());
		scenario.set("a", a);
		scenario.set("b", b);
		await scenario.cycles();
		for (const [name, value] of Object.entries(expected)) {
			expect(scenario.get(name)).toBe(value);
		}
		scenario.stop();
	});
});

describe("ladder-and-or.template (langues)", () => {
	const builders: [(locale?: Locale) => Project, string, string][] = [
		[
			templates.createLadderAndOrProject,
			"Contacts en série et en parallèle",
			"Contacts in series and in parallel",
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
