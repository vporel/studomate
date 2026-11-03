import { APP_NAME } from "@/app-info";
import { absolute } from "@/app/metadata";
import type { Locale } from "@/i18n/config";
import { serializeJsonLd } from "./json-ld";

/** JSON-LD `WebSite` of the home page: the source Google reads the site name from. */
export default function buildWebsiteJsonLd(locale: Locale): string {
	return serializeJsonLd({
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: APP_NAME,
		url: absolute(locale, "/"),
		inLanguage: locale,
	});
}
