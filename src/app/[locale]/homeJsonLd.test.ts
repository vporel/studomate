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

	it("builds its screenshot URLs on NEXT_PUBLIC_SITE_URL when set", async () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = "https://staging.example.com";
		jest.resetModules();
		const build = (await import("./homeJsonLd")).default;
		const parsed: { screenshot: string[]; url: string } = JSON.parse(
			build("fr", "d", []),
		);
		if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
		else process.env.NEXT_PUBLIC_SITE_URL = previous;

		expect(parsed.url).toBe("https://staging.example.com/");
		expect(parsed.screenshot).toHaveLength(3);
		for (const url of parsed.screenshot) {
			expect(url.startsWith("https://staging.example.com/")).toBe(true);
		}
	});
});
