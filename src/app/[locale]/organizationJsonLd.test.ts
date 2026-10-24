import organizationJsonLd from "./organizationJsonLd";

describe("organizationJsonLd", () => {
	it("describes Studomate as an Organization with its GitHub repo and founder", () => {
		const parsed = JSON.parse(organizationJsonLd);

		expect(parsed["@type"]).toBe("Organization");
		expect(parsed.name).toBe("Studomate");
		expect(parsed.url).toMatch(/^https:\/\//);
		expect(parsed.sameAs).toEqual([
			"https://github.com/vporel/studomate",
			"https://www.linkedin.com/in/vivian-nkouanang/",
		]);
		expect(parsed.founder).toEqual({
			"@type": "Person",
			name: "Vivian NKOUANANG",
			url: "https://www.vporel.com",
		});
	});

	it("builds its URLs on NEXT_PUBLIC_SITE_URL when set, on the production origin otherwise", async () => {
		const load = async (siteUrl?: string) => {
			const previous = process.env.NEXT_PUBLIC_SITE_URL;
			if (siteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
			else process.env.NEXT_PUBLIC_SITE_URL = siteUrl;
			jest.resetModules();
			const json: string = (await import("./organizationJsonLd")).default;
			if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
			else process.env.NEXT_PUBLIC_SITE_URL = previous;
			return JSON.parse(json);
		};

		const staging = await load("https://staging.example.com");
		expect(staging.url).toBe("https://staging.example.com");
		expect(staging.logo).toBe("https://staging.example.com/images/icon.png");

		const production = await load();
		expect(production.url).toBe("https://studomate.com");
		expect(production.logo).toBe("https://studomate.com/images/icon.png");
	});
});
