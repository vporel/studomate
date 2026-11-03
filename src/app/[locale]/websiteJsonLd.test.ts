import { APP_NAME } from "@/app-info";
import { absolute } from "@/app/metadata";
import buildWebsiteJsonLd from "./websiteJsonLd";

describe("buildWebsiteJsonLd", () => {
	it("declares the site name and the home URL of the locale", () => {
		const fr = JSON.parse(buildWebsiteJsonLd("fr"));
		const en = JSON.parse(buildWebsiteJsonLd("en"));

		expect(fr).toEqual({
			"@context": "https://schema.org",
			"@type": "WebSite",
			name: APP_NAME,
			url: absolute("fr", "/"),
			inLanguage: "fr",
		});
		expect(en.url).toBe(absolute("en", "/"));
		expect(en.inLanguage).toBe("en");
		expect(en.url).not.toBe(fr.url);
	});
});
