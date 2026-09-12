import { BLOCK_TYPES } from "@/schemas/ladder/block.schema";
import { SYSTEM_BLOCK_CATALOG } from "./system-block-catalog";

describe("SYSTEM_BLOCK_CATALOG", () => {
	it("couvre tous les types de bloc sauf user-program", () => {
		expect(SYSTEM_BLOCK_CATALOG.map((e) => e.blockType).sort()).toEqual(
			[...BLOCK_TYPES].filter((t) => t !== "user-program").sort(),
		);
	});

	it("les entrées à fenêtre sont exactement timer et compteur", () => {
		expect(
			SYSTEM_BLOCK_CATALOG.filter((e) => e.interaction === "config-dialog").map(
				(e) => e.blockType,
			),
		).toEqual(["timer", "counter"]);
	});

	it("chaque entrée toolbar porte un symbole et une largeur", () => {
		for (const entry of SYSTEM_BLOCK_CATALOG) {
			if (!entry.toolbar) continue;
			expect(entry.toolbar.symbol).toBeTruthy();
			expect(entry.toolbar.width).toBeGreaterThan(0);
		}
	});

	it("itemId d'explorateur uniques", () => {
		const ids = SYSTEM_BLOCK_CATALOG.map((e) => e.explorerItemId);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
