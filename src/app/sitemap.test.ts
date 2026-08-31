import { APP_URL } from "@/app-info";
import sitemap from "./sitemap";

describe("sitemap", () => {
	it("expose des URLs absolues sur le domaine public", () => {
		const entries = sitemap();
		for (const entry of entries) {
			expect(entry.url.startsWith(`${APP_URL}/`) || entry.url === `${APP_URL}/`).toBe(true);
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
});
