import { APP_NAME, APP_URL, AUTHOR_NAME, AUTHOR_URL } from "@/app-info";
import { absolute } from "@/app/metadata";
import {
	grafcetCapture,
	hmiCapture,
	ladderCapture,
} from "@/ui/components/public-pages/landing-content";
import type { Locale } from "@/i18n/config";
import { serializeJsonLd } from "./json-ld";

const SCREENSHOTS = [grafcetCapture, ladderCapture, hmiCapture];

/**
 * Construit le JSON-LD `SoftwareApplication` de la page d'accueil. `featureList` reprend les
 * titres (déjà traduits) des fonctionnalités présentées sur la page.
 */
export default function buildHomeJsonLd(
	locale: Locale,
	description: string,
	featureList: string[],
): string {
	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: APP_NAME,
		description,
		inLanguage: locale,
		url: absolute(locale, "/"),
		applicationCategory: "EducationalApplication",
		operatingSystem: "Any (web browser)",
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "EUR",
		},
		featureList,
		screenshot: SCREENSHOTS.map((path) => new URL(path, APP_URL).toString()),
		license: "https://www.gnu.org/licenses/agpl-3.0.html",
		author: {
			"@type": "Person",
			name: AUTHOR_NAME,
			url: AUTHOR_URL,
		},
	};

	return serializeJsonLd(jsonLd);
}
