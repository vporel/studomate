import { MANUAL_SECTIONS } from "@/app/[locale]/user-manual/manual-sections";
import { LOCALES } from "./config";
import { MANUAL_SLUGS, manualIdFromSlug, manualSlug } from "./manual-slugs";

describe("manual slugs", () => {
	const ids = MANUAL_SECTIONS.map((s) => s.id).filter((id) => id !== "intro");

	it("donne un slug dans chaque langue à chaque section hors introduction, et rien de plus", () => {
		for (const locale of LOCALES) {
			expect(Object.keys(MANUAL_SLUGS[locale]).sort()).toEqual([...ids].sort());
		}
	});

	it("n'a pas deux sections avec le même slug dans une langue", () => {
		for (const locale of LOCALES) {
			const slugs = Object.values(MANUAL_SLUGS[locale]);
			expect(new Set(slugs).size).toBe(slugs.length);
		}
	});

	it("n'emploie que des slugs d'URL (minuscules, chiffres, tirets) et jamais celui de l'introduction", () => {
		for (const locale of LOCALES) {
			for (const slug of Object.values(MANUAL_SLUGS[locale])) {
				expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
				expect(slug).not.toBe("intro");
			}
		}
	});

	it("traduit une section en slug et inversement", () => {
		expect(manualSlug("fr", "troubleshooting")).toBe("depannage");
		expect(manualSlug("en", "troubleshooting")).toBe("troubleshooting");
		expect(manualIdFromSlug("fr", "depannage")).toBe("troubleshooting");
		for (const locale of LOCALES) {
			for (const id of ids) {
				expect(manualIdFromSlug(locale, manualSlug(locale, id))).toBe(id);
			}
		}
	});

	it("ne reconnaît pas le slug d'une autre langue ni un slug inconnu", () => {
		expect(manualIdFromSlug("fr", "troubleshooting")).toBeNull();
		expect(manualIdFromSlug("en", "depannage")).toBeNull();
		expect(manualIdFromSlug("fr", "nope")).toBeNull();
	});
});
