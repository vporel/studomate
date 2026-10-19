import { MANUAL_SECTIONS } from "@/app/[locale]/user-manual/manual-sections";
import { LOCALES } from "@/i18n/config";
import {
	PRECACHE_ASSET_GLOBS,
	manualPagePaths,
	pagePrecacheEntries,
} from "./precache";

describe("manualPagePaths", () => {
	it("lists every top-level section in every locale with its translated slug", () => {
		const paths = manualPagePaths();

		expect(paths).toHaveLength(LOCALES.length * MANUAL_SECTIONS.length);
		expect(paths).toContain("/manuel-utilisateur/grafcet");
		expect(paths).toContain("/en/user-manual/grafcet");
		expect(paths).toContain("/manuel-utilisateur");
		expect(paths).toContain("/en/user-manual");
	});

	it("has no URL of its own for the default section, which redirects to the manual root", () => {
		const paths = manualPagePaths();

		expect(paths).not.toContain("/manuel-utilisateur/intro");
		expect(paths).not.toContain("/en/user-manual/intro");
	});

	it("carries no anchor", () => {
		expect(manualPagePaths().some((path) => path.includes("#"))).toBe(false);
	});
});

describe("pagePrecacheEntries", () => {
	it("holds the app shell, the scene window and the manual, all at the given revision", () => {
		const entries = pagePrecacheEntries("rev-1");
		const urls = entries.map((entry) => entry.url);

		expect(urls).toEqual(
			expect.arrayContaining(["/app", "/app/3d-scene", ...manualPagePaths()]),
		);
		expect(entries.every((entry) => entry.revision === "rev-1")).toBe(true);
	});

	it("holds no other public page", () => {
		const urls = pagePrecacheEntries("rev").map((entry) => entry.url);

		const others = urls.filter(
			(url) =>
				url !== "/app" &&
				url !== "/app/3d-scene" &&
				!/\/(manuel-utilisateur|user-manual)(\/|$)/.test(url),
		);
		expect(others).toEqual([]);
	});
});

describe("PRECACHE_ASSET_GLOBS", () => {
	it.each([
		"firmwares/arduino",
		"user-manual",
		"images/scenes-3d",
		"images/targets",
		"images/captures-projets",
	])("covers public/%s", (folder) => {
		expect(PRECACHE_ASSET_GLOBS.some((glob) => glob.includes(folder))).toBe(
			true,
		);
	});

	it("covers the fonts emitted by next/font", () => {
		expect(
			PRECACHE_ASSET_GLOBS.some(
				(glob) => glob.startsWith(".next/static") && glob.includes("woff2"),
			),
		).toBe(true);
	});

	it("leaves out the videos and the training content of the public pages", () => {
		expect(PRECACHE_ASSET_GLOBS.join()).not.toMatch(/videos|training/);
	});
});
