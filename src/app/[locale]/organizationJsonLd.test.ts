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
});
