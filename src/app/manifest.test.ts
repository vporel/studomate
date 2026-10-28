import { existsSync } from "node:fs";
import { join } from "node:path";
import manifest from "./manifest";

describe("manifest", () => {
	const icons = manifest().icons ?? [];

	it("declares maskable icons in 192 and 512 pixels, besides the regular ones", () => {
		const maskable = icons.filter((icon) => icon.purpose === "maskable");

		expect(maskable.map((icon) => icon.sizes).sort()).toEqual([
			"192x192",
			"512x512",
		]);
		expect(icons.filter((icon) => !icon.purpose)).toHaveLength(2);
	});

	it("only points to icons that exist in public/", () => {
		for (const icon of icons) {
			expect(existsSync(join("public", icon.src))).toBe(true);
		}
	});
});
