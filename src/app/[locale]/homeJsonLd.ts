import { APP_NAME, AUTHOR_NAME, AUTHOR_URL } from "@/app-info";
import { absolute } from "@/i18n/metadata";
import type { Locale } from "@/i18n/config";
import { serializeJsonLd } from "./json-ld";

/** Construit le JSON-LD `SoftwareApplication` de la page d'accueil. */
export default function buildHomeJsonLd(locale: Locale, description: string): string {
	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: APP_NAME,
		description,
		url: absolute(locale, "/"),
		applicationCategory: "EducationalApplication",
		operatingSystem: "Any (web browser)",
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "EUR",
		},
		license: "https://www.gnu.org/licenses/agpl-3.0.html",
		author: {
			"@type": "Person",
			name: AUTHOR_NAME,
			url: AUTHOR_URL,
		},
	};

	return serializeJsonLd(jsonLd);
}
