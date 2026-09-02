import { APP_URL } from "@/app-info";
import sitemap from "./sitemap";

describe("sitemap", () => {
	it("expose des URLs absolues sur le domaine public", () => {
		const entries = sitemap();
		for (const entry of entries) {
			expect(
				entry.url.startsWith(`${APP_URL}/`) || entry.url === `${APP_URL}/`,
			).toBe(true);
		}
	});

	it("inclut la landing et l'application", () => {
		const urls = sitemap().map((e) => e.url);
		expect(urls).toContain(`${APP_URL}/`);
		expect(urls).toContain(`${APP_URL}/app`);
	});

	it("donne la priorité maximale à la landing", () => {
		const home = sitemap().find((e) => e.url === `${APP_URL}/`);
		expect(home?.priority).toBe(1);
	});

	it("expose chaque page publique dans les deux langues (FR sans préfixe, EN sous /en)", () => {
		const urls = sitemap().map((e) => e.url);
		// FR : slugs traduits sans préfixe
		expect(urls).toContain(`${APP_URL}/a-propos`);
		expect(urls).toContain(`${APP_URL}/politique-de-confidentialite`);
		// EN : préfixe /en + slugs traduits
		expect(urls).toContain(`${APP_URL}/en`);
		expect(urls).toContain(`${APP_URL}/en/about`);
		expect(urls).toContain(`${APP_URL}/en/privacy`);
	});

	it("déclare les alternates hreflang sur les pages localisées", () => {
		const about = sitemap().find((e) => e.url === `${APP_URL}/a-propos`);
		expect(about?.alternates?.languages).toEqual({
			fr: `${APP_URL}/a-propos`,
			en: `${APP_URL}/en/about`,
		});
	});
});
