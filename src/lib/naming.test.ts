import { nextAvailableName, nextCopyName } from "./naming";

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

describe("nextCopyName", () => {
	it("suffixe _2 quand le nom d'origine n'est pas pris", () => {
		expect(nextCopyName("Mon_bloc", ["Mon_bloc"])).toBe("Mon_bloc_2");
	});

	it("avance au premier suffixe libre", () => {
		expect(
			nextCopyName("Mon_bloc", ["Mon_bloc", "Mon_bloc_2", "Mon_bloc_3"]),
		).toBe("Mon_bloc_4");
	});

	it("incrémente un suffixe _N déjà porté au lieu de l'empiler", () => {
		expect(nextCopyName("Mon_bloc_2", ["Mon_bloc_2"])).toBe("Mon_bloc_3");
	});

	it("saute les numéros déjà pris à partir du suffixe d'origine", () => {
		expect(nextCopyName("Mon_bloc_2", ["Mon_bloc_2", "Mon_bloc_3"])).toBe(
			"Mon_bloc_4",
		);
	});
});
