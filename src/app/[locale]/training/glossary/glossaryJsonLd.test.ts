import buildGlossaryJsonLd from "./glossaryJsonLd";
import { buildGlossaryEntries } from "./glossary-view";

describe("buildGlossaryJsonLd", () => {
	const entries = buildGlossaryEntries("fr");
	const parsed = JSON.parse(
		buildGlossaryJsonLd("fr", "Glossaire", "Desc", entries),
	);

	it("produit un DefinedTermSet localisé", () => {
		expect(parsed["@type"]).toBe("DefinedTermSet");
		expect(parsed.inLanguage).toBe("fr");
		expect(parsed.url).toMatch(/^https:\/\/.+\/formations\/glossaire$/);
	});

	it("décrit un terme par entrée, ancré sur son identifiant", () => {
		expect(parsed.hasDefinedTerm).toHaveLength(entries.length);
		const step = parsed.hasDefinedTerm.find(
			(t: { name: string }) => t.name === "Étape",
		);
		expect(step.url).toBe(`${parsed.url}#step`);
		expect(step.description).not.toContain("<");
	});

	it("n'expose des alias que pour les entrées qui en ont", () => {
		const plc = parsed.hasDefinedTerm.find(
			(t: { name: string }) => t.name === "Automate",
		);
		expect(plc.alternateName).toContain("API");
		const variable = parsed.hasDefinedTerm.find(
			(t: { name: string }) => t.name === "Variable",
		);
		expect(variable.alternateName).toBeUndefined();
	});

	it("n'autorise pas une balise </script> injectée", () => {
		const html = buildGlossaryJsonLd("fr", "</script>", "d", []);
		expect(html).not.toContain("</script>");
	});
});
