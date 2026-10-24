import { LOCALES } from "@/i18n/config";
import { OG_IMAGE_KEYS } from "./og-image";
import ogTitle from "./og-title";

describe("ogTitle", () => {
	it.each(LOCALES)("gives every image family a non-empty title (%s)", (locale) => {
		for (const key of OG_IMAGE_KEYS) {
			expect(ogTitle(locale, key).length).toBeGreaterThan(0);
		}
	});

	it("uses the module page title for a module", () => {
		expect(ogTitle("fr", "a1")).toBe("Module A1 : Bases du GRAFCET");
		expect(ogTitle("en", "a1")).toBe("Module A1: GRAFCET basics");
	});

	it("uses the hub title for the training family", () => {
		expect(ogTitle("fr", "training")).toBe("Formation GRAFCET et Ladder gratuite");
	});
});
