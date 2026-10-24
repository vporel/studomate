import {
	buildGlossaryEntries,
	buildGlossarySections,
	glossaryFigureSrc,
} from "./glossary-view";
import { GLOSSARY_SECTIONS } from "./glossary-entries";

describe("glossaryFigureSrc", () => {
	it("pointe vers la variante -en d'une figure traduisible en anglais seulement", () => {
		expect(glossaryFigureSrc("grafcet", "step", true, "fr")).toBe(
			"/glossary/grafcet/step.svg",
		);
		expect(glossaryFigureSrc("grafcet", "step", true, "en")).toBe(
			"/glossary/grafcet/step-en.svg",
		);
	});

	it("garde un seul fichier pour une figure neutre", () => {
		expect(glossaryFigureSrc("ladder", "coil", false, "en")).toBe(
			"/glossary/ladder/coil.svg",
		);
	});
});

describe("buildGlossaryEntries", () => {
	const fr = buildGlossaryEntries("fr");
	const find = (id: string) => fr.find((e) => e.id === id)!;

	it("découpe les alias et ignore les vides", () => {
		expect(find("plc").aliases).toEqual([
			"API",
			"automate programmable industriel",
		]);
		expect(find("variable").aliases).toEqual([]);
	});

	it("rend le Markdown de la définition en HTML", () => {
		expect(find("variable").definitionHtml).toContain("<p>");
		expect(find("step-variable").definitionHtml).toContain(
			"<code>X2 = VRAI</code>",
		);
		expect(find("mnemonic").detailsHtml).toBe("");
	});

	it("fournit une définition sans marques de code", () => {
		expect(find("step-variable").definition).not.toContain("`");
	});

	it("ne cherche que dans le terme, sans accents ni majuscules", () => {
		expect(find("step").searchText).toBe("etape");
		expect(find("plc").searchText).toBe("automate");
	});

	it("trie les entrées par ordre alphabétique des termes, accents ignorés", () => {
		const terms = fr.map((e) => e.term);
		expect(terms).toEqual([...terms].sort((a, b) => a.localeCompare(b, "fr")));
		expect(terms.indexOf("Étape")).toBeGreaterThan(terms.indexOf("Entrée"));
		expect(terms.indexOf("Étape")).toBeLessThan(terms.indexOf("Évolution"));
		const en = buildGlossaryEntries("en").map((e) => e.term);
		expect(en).toEqual([...en].sort((a, b) => a.localeCompare(b, "en")));
	});

	it("résout les termes liés dans la langue demandée", () => {
		expect(find("input").related.map((r) => r.term)).toContain("Sortie");
		const en = buildGlossaryEntries("en").find((e) => e.id === "input")!;
		expect(en.related.map((r) => r.term)).toContain("Output");
	});

	it("attache la figure avec sa source localisée et son alt", () => {
		expect(find("step").figure?.src).toBe("/glossary/grafcet/step.svg");
		expect(find("step").figure?.alt).not.toBe("");
		const en = buildGlossaryEntries("en").find((e) => e.id === "step")!;
		expect(en.figure?.src).toBe("/glossary/grafcet/step-en.svg");
		expect(find("variable").figure).toBeUndefined();
	});
});

describe("buildGlossarySections", () => {
	it("suit l'ordre déclaré des sections", () => {
		expect(buildGlossarySections("fr").map((s) => s.id)).toEqual([
			...GLOSSARY_SECTIONS,
		]);
	});
});
