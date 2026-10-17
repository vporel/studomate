import { APP_URL } from "@/app-info";
import robots from "./robots";

describe("robots", () => {
	it("autorise le site, bloque la scène 3D et publie le sitemap", () => {
		const result = robots();
		expect(result.rules).toEqual({
			userAgent: "*",
			allow: "/",
			disallow: "/app/3d-scene",
		});
		expect(result.sitemap).toBe(`${APP_URL}/sitemap.xml`);
	});
});
