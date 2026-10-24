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
