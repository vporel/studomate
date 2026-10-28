import { APP_URL } from "@/app-info";
import { getPathname } from "@/i18n/navigation";
import { routing, type PublicPathname } from "@/i18n/routing";
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
		expect(urls).toContain(`${APP_URL}/formations`);
		expect(urls).toContain(`${APP_URL}/formations/a1`);
		expect(urls).toContain(`${APP_URL}/formations/glossaire`);
		// EN : préfixe /en + slugs traduits
		expect(urls).toContain(`${APP_URL}/en`);
		expect(urls).toContain(`${APP_URL}/en/about`);
		expect(urls).toContain(`${APP_URL}/en/privacy`);
		expect(urls).toContain(`${APP_URL}/en/training`);
		expect(urls).toContain(`${APP_URL}/en/training/a1`);
		expect(urls).toContain(`${APP_URL}/en/training/glossary`);
	});

	it("n'expose aucune date lastModified artificielle", () => {
		expect(sitemap().some((e) => "lastModified" in e)).toBe(false);
	});

	it("expose chaque page statique du routage, dans les deux langues", () => {
		const urls = sitemap().map((e) => e.url);
		const staticKeys = Object.keys(routing.pathnames).filter(
			(k) => !k.includes("["),
		);
		for (const key of staticKeys) {
			for (const locale of routing.locales) {
				const url = new URL(
					getPathname({ locale, href: key as PublicPathname }),
					APP_URL,
				).toString();
				expect(urls).toContain(url);
			}
		}
	});

	it("déclare les alternates hreflang sur les pages localisées", () => {
		const about = sitemap().find((e) => e.url === `${APP_URL}/a-propos`);
		expect(about?.alternates?.languages).toEqual({
			fr: `${APP_URL}/a-propos`,
			en: `${APP_URL}/en/about`,
			"x-default": `${APP_URL}/a-propos`,
		});
	});

	it("déclare les alternates hreflang pour les pages du module Formations", () => {
		const training = sitemap().find((e) => e.url === `${APP_URL}/formations`);
		expect(training?.alternates?.languages).toEqual({
			fr: `${APP_URL}/formations`,
			en: `${APP_URL}/en/training`,
			"x-default": `${APP_URL}/formations`,
		});
	});

	it("expose chaque section du manuel dans les deux langues, hors introduction servie à l'URL de base", () => {
		const entries = sitemap();
		const urls = entries.map((e) => e.url);
		expect(urls).toContain(`${APP_URL}/manuel-utilisateur/grafcet`);
		expect(urls).toContain(`${APP_URL}/en/user-manual/grafcet`);
		expect(urls).toContain(`${APP_URL}/manuel-utilisateur/raccourcis-clavier`);
		expect(urls).toContain(`${APP_URL}/en/user-manual/shortcuts`);
		expect(urls).not.toContain(`${APP_URL}/manuel-utilisateur/shortcuts`);
		expect(urls).not.toContain(`${APP_URL}/manuel-utilisateur/intro`);
		expect(urls.filter((u) => u.endsWith("/manuel-utilisateur"))).toHaveLength(
			1,
		);

		const grafcet = entries.find(
			(e) => e.url === `${APP_URL}/manuel-utilisateur/grafcet`,
		);
		expect(grafcet?.alternates?.languages).toEqual({
			fr: `${APP_URL}/manuel-utilisateur/grafcet`,
			en: `${APP_URL}/en/user-manual/grafcet`,
			"x-default": `${APP_URL}/manuel-utilisateur/grafcet`,
		});
	});

	it("expose le module A0 et les étapes de théorie des modules, avec leurs alternates", () => {
		const entries = sitemap();
		const urls = entries.map((e) => e.url);
		expect(urls).toContain(`${APP_URL}/formations/a0`);
		expect(urls).toContain(`${APP_URL}/en/training/a0`);
		expect(urls).toContain(`${APP_URL}/formations/a1/theorie-temporisation`);

		const step = entries.find(
			(e) => e.url === `${APP_URL}/formations/a1/theorie-temporisation`,
		);
		expect(step?.alternates?.languages).toEqual({
			fr: `${APP_URL}/formations/a1/theorie-temporisation`,
			en: `${APP_URL}/en/training/a1/theory-timer`,
			"x-default": `${APP_URL}/formations/a1/theorie-temporisation`,
		});
	});

	it("n'expose ni les exercices et synthèses (noindex), ni la première étape (servie par la page du module)", () => {
		const urls = sitemap().map((e) => e.url);
		expect(urls).not.toContain(`${APP_URL}/formations/a1/exercice-sequence-lineaire`);
		expect(urls).not.toContain(`${APP_URL}/formations/a1/synthese-parking`);
		expect(urls).not.toContain(`${APP_URL}/formations/a1/definition-grafcet`);
		expect(urls).not.toContain(`${APP_URL}/formations/a0/automatisme`);
	});
});
