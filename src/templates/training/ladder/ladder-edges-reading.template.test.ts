import * as templates from "./ladder-edges-reading.template";
import type { Locale } from "@/i18n/config";
import type Project from "@/schemas/project/project.schema";
import PlcScenario from "@tests/utils/plc-scenario";
import { createLadderEdgesReadingProject } from "./ladder-edges-reading.template";

describe("ladder-edges-reading.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("les titres des réseaux ne divulguent pas le type de contact", () => {
		const titles = createLadderEdgesReadingProject().main.sections.map(
			(s) => s.title,
		);
		expect(titles).toEqual([
			"Réseau 1",
			"Réseau 2",
			"Réseau 3",
			"Remise à zéro",
		]);
	});

	it("commut est un commutateur maintenu et raz un bouton poussoir", () => {
		const variables = createLadderEdgesReadingProject().variables;
		const behaviorOf = (name: string) =>
			variables.find((v) => v.mnemonic === name)?.behavior?.kind;
		expect(behaviorOf("commut")).toBe("toggle-switch-no");
		expect(behaviorOf("raz")).toBe("push-button-no");
		expect(variables.some((v) => v.mnemonic === "bp")).toBe(false);
	});

	it("le contact NO suit le maintien, P et N ne durent qu'un cycle", async () => {
		const scenario = new PlcScenario(createLadderEdgesReadingProject());
		await scenario.cycles(1);
		expect(scenario.get("s_no")).toBe(false);

		scenario.set("commut", true);
		await scenario.cycles(1);
		expect(scenario.get("s_no")).toBe(true);
		expect(scenario.get("s_p")).toBe(true);
		expect(scenario.get("s_n")).toBe(false);

		await scenario.tap("raz", 1);
		await scenario.cycles(1);
		expect(scenario.get("s_no")).toBe(true);
		expect(scenario.get("s_p")).toBe(false);

		scenario.set("commut", false);
		await scenario.cycles(1);
		expect(scenario.get("s_n")).toBe(true);
		scenario.stop();
	});

	it("raz remet les trois sorties à faux", async () => {
		const scenario = new PlcScenario(createLadderEdgesReadingProject());
		scenario.set("commut", true);
		await scenario.cycles(2);
		scenario.set("commut", false);
		await scenario.cycles(1);
		await scenario.tap("raz", 1);
		expect(scenario.get("s_no")).toBe(false);
		expect(scenario.get("s_p")).toBe(false);
		expect(scenario.get("s_n")).toBe(false);
		scenario.stop();
	});
});

describe("ladder-edges-reading.template (langues)", () => {
	const builders: [(locale?: Locale) => Project, string, string][] = [
		[
			templates.createLadderEdgesReadingProject,
			"Lire les fronts",
			"Reading edges",
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
