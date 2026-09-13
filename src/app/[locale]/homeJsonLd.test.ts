import buildHomeJsonLd from "./homeJsonLd";

describe("buildHomeJsonLd", () => {
	it("produces a SoftwareApplication schema with a locale-aware absolute URL", () => {
		const html = buildHomeJsonLd("fr", "Description de test");
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
		const html = buildHomeJsonLd("fr", "</script><script>alert(1)</script>");
		expect(html).not.toContain("</script>");
	});
});
