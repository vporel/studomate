import { flattenManualSections, MANUAL_SECTIONS } from "./manual-sections";

const t = (key: string) => `label:${key}`;

describe("manual-sections", () => {
	it("expose une section « accounts » sans sous-section, après « projects »", () => {
		const ids = MANUAL_SECTIONS.map((s) => s.id);
		expect(ids).toContain("accounts");
		expect(ids.indexOf("accounts")).toBe(ids.indexOf("projects") + 1);
		expect(MANUAL_SECTIONS.find((s) => s.id === "accounts")?.children).toBeUndefined();
	});

	it("expose une section « cross-references » sans sous-section, avant « simulation »", () => {
		const ids = MANUAL_SECTIONS.map((s) => s.id);
		expect(ids).toContain("cross-references");
		expect(ids.indexOf("cross-references")).toBeLessThan(ids.indexOf("simulation"));
		expect(
			MANUAL_SECTIONS.find((s) => s.id === "cross-references")?.children,
		).toBeUndefined();
	});

	it("chaque enfant d'une section est un identifiant d'ancre valide (préfixé par le parent)", () => {
		for (const section of MANUAL_SECTIONS) {
			for (const child of section.children ?? []) {
				expect(child.startsWith(`${section.id}-`)).toBe(true);
			}
		}
	});

	describe("flattenManualSections", () => {
		const flat = flattenManualSections(t);

		it("émet un item par entrée du plan (parents + enfants)", () => {
			const expected = MANUAL_SECTIONS.reduce(
				(n, s) => n + 1 + (s.children?.length ?? 0),
				0,
			);
			expect(flat).toHaveLength(expected);
		});

		it("résout les libellés via le traducteur fourni", () => {
			expect(flat.find((f) => f.id === "intro")?.label).toBe("label:intro");
		});

		it("marque les parents à sous-sections avec hasChildren", () => {
			expect(flat.find((f) => f.id === "grafcet")?.hasChildren).toBe(true);
			expect(flat.find((f) => f.id === "toolbar")?.hasChildren).toBe(false);
		});

		it("rattache chaque enfant à son parentLabel", () => {
			const canvas = flat.find((f) => f.id === "grafcet-canvas");
			expect(canvas?.parentLabel).toBe("label:grafcet");
			expect(canvas?.hasChildren).toBeUndefined();
		});
	});
});
