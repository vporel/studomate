import { nextAvailableName } from "./naming";

describe("nextAvailableName", () => {
	it("génère Label_1 pour une liste vide", () => {
		expect(nextAvailableName("Ladder", [])).toBe("Ladder_1");
	});

	it("avance au premier numéro libre", () => {
		expect(nextAvailableName("Ladder", ["Ladder_1", "Ladder_2"])).toBe(
			"Ladder_3",
		);
	});

	it("ignore les trous de numérotation", () => {
		expect(nextAvailableName("Ladder", ["Ladder_2"])).toBe("Ladder_1");
	});

	it("ignore les noms d'un autre label", () => {
		expect(nextAvailableName("Ladder", ["Grafcet_1"])).toBe("Ladder_1");
	});
});
