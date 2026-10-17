import { AUTHOR_NAME, AUTHOR_URL } from "@/app-info";
import manifest from "./manifest";
import routes from "./routes";
import {
	rootMetadata,
	rootViewport,
	siteVerification,
	THEME_COLOR,
} from "./root-metadata";

describe("rootMetadata", () => {
	it("désigne l'auteur avec une URL non vide", () => {
		expect(rootMetadata.authors).toEqual([
			{ name: AUTHOR_NAME, url: AUTHOR_URL },
		]);
		expect(AUTHOR_URL).toMatch(/^https:\/\//);
	});

	it("n'émet aucune balise de vérification sans jeton", () => {
		expect(siteVerification(undefined, undefined)).toBeUndefined();
		expect(siteVerification("", "")).toBeUndefined();
	});

	it("émet les balises Google et Bing selon les jetons fournis", () => {
		expect(siteVerification("g-token", undefined)).toEqual({
			google: "g-token",
		});
		expect(siteVerification(undefined, "b-token")).toEqual({
			other: { "msvalidate.01": "b-token" },
		});
		expect(siteVerification("g-token", "b-token")).toEqual({
			google: "g-token",
			other: { "msvalidate.01": "b-token" },
		});
	});
});

describe("themeColor et manifest", () => {
	it("partage la même couleur entre viewport et manifest", () => {
		expect(rootViewport.themeColor).toBe(THEME_COLOR);
		expect(manifest().theme_color).toBe(THEME_COLOR);
	});

	it("fixe l'identité de la PWA indépendamment de start_url", () => {
		expect(manifest().id).toBe(routes.app());
	});
});
