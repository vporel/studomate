import { LOCALES } from "@/i18n/config";
import { manualSlug } from "@/i18n/manual-slugs";
import manualSectionHref from "./manual-section-href";

describe("manualSectionHref", () => {
	it.each(LOCALES)("points to the section page with the %s slug", (locale) => {
		const href = manualSectionHref("getting-started");
		expect(typeof href).toBe("function");
		expect((href as (locale: string) => unknown)(locale)).toEqual({
			pathname: "/user-manual/[section]",
			params: { section: manualSlug(locale, "getting-started") },
		});
	});

	it("uses a translated slug where locales differ", () => {
		const href = manualSectionHref("getting-started") as (locale: string) => {
			params: { section: string };
		};
		expect(href("fr").params.section).toBe("demarrage");
		expect(href("en").params.section).toBe("getting-started");
	});
});
