import * as templates from "./ladder-packing.template";
import type { Locale } from "@/i18n/config";
import type Project from "@/schemas/project/project.schema";
import PlcScenario from "@tests/utils/plc-scenario";
import {
	PACKING_PRESET,
	createLadderPackingProject,
	createLadderPackingSolution,
} from "./ladder-packing.template";

async function pieces(scenario: PlcScenario, count: number) {
	for (let i = 0; i < count; i++) {
		await scenario.press("capteur_piece", 1);
		scenario.release("capteur_piece");
		await scenario.cycles(1);
	}
}

describe("ladder-packing.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé ne fournit aucune variable", () => {
		expect(createLadderPackingProject().variables).toHaveLength(0);
	});

	it("cycle complet : arrêt à la présélection, changement de caisse, redémarrage automatique", async () => {
		const scenario = new PlcScenario(createLadderPackingSolution());
		await scenario.cycles();
		await scenario.tap("marche");
		await scenario.cycles(2);
		expect(scenario.get("convoyeur")).toBe(true);

		await pieces(scenario, PACKING_PRESET);
		await scenario.cycles(2);
		expect(scenario.get("convoyeur")).toBe(false);

		await scenario.seconds(6);
		expect(scenario.get("convoyeur")).toBe(true);
		expect(scenario.get("cpt_pieces.CV")).toBe(0);
		scenario.stop();
	});

	it("voyant de défaut : clignotant, fixe une fois acquitté, éteint quand le défaut disparaît", async () => {
		const scenario = new PlcScenario(createLadderPackingSolution());
		await scenario.cycles();
		await scenario.tap("marche");
		await scenario.cycles(2);

		await scenario.press("thermique", 2);
		expect(scenario.get("convoyeur")).toBe(false);
		const blinking: boolean[] = [];
		for (let i = 0; i < 30; i++) {
			await scenario.cycles(1);
			blinking.push(scenario.get("voyant_defaut") as boolean);
		}
		expect(blinking).toContain(true);
		expect(blinking).toContain(false);

		await scenario.tap("acquit", 2);
		await scenario.cycles(6);
		expect(scenario.get("voyant_defaut")).toBe(true);

		scenario.release("thermique");
		await scenario.cycles(3);
		expect(scenario.get("voyant_defaut")).toBe(false);
		expect(scenario.get("convoyeur")).toBe(false);

		await scenario.tap("marche");
		await scenario.cycles(2);
		expect(scenario.get("convoyeur")).toBe(true);
		scenario.stop();
	});
	it("Arrêt arrête le convoyeur, même pendant le comptage", async () => {
		const scenario = new PlcScenario(createLadderPackingSolution());
		await scenario.cycles();
		await scenario.tap("marche");
		await scenario.cycles(2);
		expect(scenario.get("convoyeur")).toBe(true);
		await pieces(scenario, 2);
		await scenario.tap("arret", 2);
		expect(scenario.get("convoyeur")).toBe(false);
		scenario.stop();
	});

	it("le changement de caisse dure 5 s : le convoyeur est encore à l'arrêt à 4 s, reparti à 6 s", async () => {
		const scenario = new PlcScenario(createLadderPackingSolution());
		await scenario.cycles();
		await scenario.tap("marche");
		await scenario.cycles(2);
		await pieces(scenario, PACKING_PRESET);
		await scenario.seconds(4);
		expect(scenario.get("convoyeur")).toBe(false);
		await scenario.seconds(2);
		expect(scenario.get("convoyeur")).toBe(true);
		scenario.stop();
	});

	it("le programme est découpé en trois sous-programmes appelés par le Main dans l'ordre", () => {
		const project = createLadderPackingSolution();
		const names = Object.values(project.ladders)
			.filter((ladder) => !ladder.isMain())
			.map((ladder) => ladder.name)
			.sort();
		expect(names).toEqual(
			["Changement de caisse", "Comptage", "Défaut et marche"].sort(),
		);
		expect(project.main.sections).toHaveLength(3);
	});
});

describe("ladder-packing.template (langues)", () => {
	const builders: [(locale?: Locale) => Project, string, string][] = [
		[templates.createLadderPackingProject, "Mise en caisse", "Case packing"],
		[
			templates.createLadderPackingSolution,
			"Mise en caisse : solution",
			"Case packing: solution",
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
