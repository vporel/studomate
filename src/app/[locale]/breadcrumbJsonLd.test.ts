import buildBreadcrumbJsonLd from "./breadcrumbJsonLd";
import manualSectionHref from "./user-manual/manual-section-href";

const parse = (json: string) => JSON.parse(json);

describe("buildBreadcrumbJsonLd", () => {
	it("lists the ancestors then the current page, positioned from 1, with absolute URLs", () => {
		const data = parse(
			buildBreadcrumbJsonLd(
				"fr",
				[{ label: "Manuel utilisateur", href: "/user-manual" }],
				{ label: "Dépannage", href: manualSectionHref("troubleshooting") },
			),
		);

		expect(data["@type"]).toBe("BreadcrumbList");
		expect(data.itemListElement).toEqual([
			{
				"@type": "ListItem",
				position: 1,
				name: "Manuel utilisateur",
				item: "https://studomate.com/manuel-utilisateur",
			},
			{
				"@type": "ListItem",
				position: 2,
				name: "Dépannage",
				item: "https://studomate.com/manuel-utilisateur/depannage",
			},
		]);
	});

	it("uses the URLs of the requested locale", () => {
		const data = parse(
			buildBreadcrumbJsonLd(
				"en",
				[{ label: "Training", href: "/training" }],
				{ label: "Module A1", href: "/training/a1" },
			),
		);

		expect(data.itemListElement.map((i: { item: string }) => i.item)).toEqual([
			"https://studomate.com/en/training",
			"https://studomate.com/en/training/a1",
		]);
	});

	it("stops at the last ancestor when there is no current page", () => {
		const data = parse(
			buildBreadcrumbJsonLd("fr", [
				{ label: "Formations", href: "/training" },
				{ label: "Module A1", href: "/training/a1" },
			]),
		);

		expect(data.itemListElement).toHaveLength(2);
		expect(data.itemListElement[1].position).toBe(2);
	});

	it("escapes angle brackets of translated labels", () => {
		const json = buildBreadcrumbJsonLd("fr", [
			{ label: "</script>", href: "/training" },
		]);

		expect(json).not.toContain("</script>");
	});
});
