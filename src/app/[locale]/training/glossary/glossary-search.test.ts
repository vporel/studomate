import { matchesQuery, normalizeForSearch } from "./glossary-search";

describe("normalizeForSearch", () => {
	it("passe en minuscules et retire les accents", () => {
		expect(normalizeForSearch("Étape Réceptivité")).toBe("etape receptivite");
	});
});

describe("matchesQuery", () => {
	const text = normalizeForSearch("Étape; étape initiale; carré numéroté");

	it("accepte une requête vide", () => {
		expect(matchesQuery(text, "")).toBe(true);
		expect(matchesQuery(text, "   ")).toBe(true);
	});

	it("ignore la casse et les accents de la requête", () => {
		expect(matchesQuery(text, "ETAPE")).toBe(true);
		expect(matchesQuery(text, "carre")).toBe(true);
	});

	it("exige tous les mots, dans n'importe quel ordre", () => {
		expect(matchesQuery(text, "numerote etape")).toBe(true);
		expect(matchesQuery(text, "etape bobine")).toBe(false);
	});
});
