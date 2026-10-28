import trainingStepPath from "./training-paths";

describe("trainingStepPath", () => {
	it("sert la première étape à l'URL du module", () => {
		expect(trainingStepPath("fr", "a1", "grafcet-definition", 0)).toBe(
			"/formations/a1",
		);
		expect(trainingStepPath("en", "a1", "grafcet-definition", 0)).toBe(
			"/en/training/a1",
		);
	});

	it("sert les étapes suivantes sous le module, avec le slug traduit", () => {
		expect(trainingStepPath("fr", "a2", "theory-edges", 7)).toBe(
			"/formations/a2/theorie-fronts",
		);
		expect(trainingStepPath("en", "a2", "theory-edges", 7)).toBe(
			"/en/training/a2/theory-edges",
		);
	});
});
