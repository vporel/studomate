import buildHomeJsonLd from "./homeJsonLd";

describe("buildHomeJsonLd", () => {
	it("produces a SoftwareApplication schema with a locale-aware absolute URL", () => {
		const html = buildHomeJsonLd("fr", "Description de test", ["A", "B"]);
		const parsed = JSON.parse(html);

		expect(parsed["@type"]).toBe("SoftwareApplication");
		expect(parsed.description).toBe("Description de test");
		expect(parsed.url).toMatch(/^https:\/\//);
		expect(parsed.offers).toEqual({
			"@type": "Offer",
			price: "0",
			priceCurrency: "EUR",
		});
	});

	it("keeps an injected description from breaking out of the <script> tag", () => {
		const html = buildHomeJsonLd(
			"fr",
			"</script><script>alert(1)</script>",
			[],
		);
		expect(html).not.toContain("</script>");
	});

	it("déclare la langue de la page, la liste des fonctionnalités et des captures absolues", () => {
		const parsed = JSON.parse(buildHomeJsonLd("en", "d", ["Editing", "HMI"]));

		expect(parsed.inLanguage).toBe("en");
		expect(parsed.featureList).toEqual(["Editing", "HMI"]);
		expect(parsed.screenshot).toHaveLength(3);
		for (const url of parsed.screenshot) expect(url).toMatch(/^https:\/\//);
	});
});
