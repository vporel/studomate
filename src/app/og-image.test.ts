import {
	OG_IMAGE_KEYS,
	ogImageKey,
	ogImageUrl,
} from "./og-image";

describe("ogImageKey", () => {
	it.each([
		["/", "default"],
		["/about", "default"],
		["/contact", "default"],
		["/legal", "default"],
		["/training", "training"],
		["/training/glossary", "glossary"],
		["/user-manual", "manual"],
		["/training/a0", "a0"],
		["/training/a3", "a3"],
	] as const)("%s uses the %s image", (pathname, key) => {
		expect(ogImageKey(pathname, "fr")).toBe(key);
	});

	it("gives a step the image of its module", () => {
		expect(
			ogImageKey(
				{ pathname: "/training/a2/[step]", params: { step: "theory-edges" } },
				"en",
			),
		).toBe("a2");
	});

	it("gives a manual section the manual image, resolving a per-locale href", () => {
		expect(
			ogImageKey(
				(locale) => ({
					pathname: "/user-manual/[section]",
					params: { section: locale === "fr" ? "depannage" : "troubleshooting" },
				}),
				"fr",
			),
		).toBe("manual");
	});

	it("is defined for every key it can return", () => {
		for (const key of OG_IMAGE_KEYS) {
			expect(ogImageUrl("fr", key)).toBe(`/api/og/fr/${key}`);
		}
	});
});

describe("ogImageUrl", () => {
	it("is localised", () => {
		expect(ogImageUrl("en", "training")).toBe("/api/og/en/training");
	});
});
