import * as templates from "./ladder-reading.template";
import type { Locale } from "@/i18n/config";
import type Project from "@/schemas/project/project.schema";
import PlcScenario from "@tests/utils/plc-scenario";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";
import { createLadderReadingProject } from "./ladder-reading.template";

describe("ladder-reading.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("les titres et descriptions des réseaux ne divulguent pas la logique à prédire", () => {
		const sections = createLadderReadingProject().main.sections;
		expect(sections.map((s) => s.title)).toEqual([
			"Réseau 1",
			"Réseau 2",
			"Réseau 3",
			"Réseau 4",
		]);
		for (const { description } of sections) {
			expect(description).not.toMatch(/\b(ET|OU|NON)\b/);
		}
	});

	it("passe l'analyse sans erreur", () => {
		const { analysis } = compilePipelineDetailed(createLadderReadingProject());
		expect(analysis.issues.filter((i) => i.severity === "error")).toHaveLength(
			0,
		);
	});

	it.each([
		[false, false, false, { s1: false, s2: false, s3: false, s4: false }],
		[true, false, false, { s1: false, s2: true, s3: true, s4: true }],
		[true, true, false, { s1: true, s2: true, s3: false, s4: true }],
		[true, true, true, { s1: true, s2: true, s3: false, s4: false }],
	])(
		"a=%s b=%s c=%s donne les sorties attendues",
		async (a, b, c, expected) => {
			const scenario = new PlcScenario(createLadderReadingProject());
			scenario.set("a", a);
			scenario.set("b", b);
			scenario.set("c", c);
			await scenario.cycles();
			for (const [name, value] of Object.entries(expected)) {
				expect(scenario.get(name)).toBe(value);
			}
			scenario.stop();
		},
	);
});

describe("ladder-reading.template (langues)", () => {
	const builders: [(locale?: Locale) => Project, string, string][] = [
		[
			templates.createLadderReadingProject,
			"Lire un programme Ladder",
			"Reading a Ladder program",
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
