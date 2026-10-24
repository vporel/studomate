import { APP_URL } from "@/app-info";
import robots from "./robots";

describe("robots", () => {
	it("autorise tout le site (la scène 3D reste lisible pour son noindex) et publie le sitemap", () => {
		const result = robots();
		expect(result.rules).toEqual({
			userAgent: "*",
			allow: "/",
		});
		expect(result.sitemap).toBe(`${APP_URL}/sitemap.xml`);
	});
});
