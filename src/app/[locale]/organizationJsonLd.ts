import { APP_NAME, APP_REPO_URL, APP_URL, AUTHOR_NAME, AUTHOR_URL } from "@/app-info";
import { serializeJsonLd } from "./json-ld";

/**
 * JSON-LD `Organization` de Studomate, injecté sur toutes les pages publiques (layout de
 * `[locale]`). Contenu statique, indépendant de la locale.
 */
const organizationJsonLd = serializeJsonLd({
	"@context": "https://schema.org",
	"@type": "Organization",
	name: APP_NAME,
	url: APP_URL,
	logo: new URL("/images/icon.png", APP_URL).toString(),
	sameAs: [APP_REPO_URL],
	founder: {
		"@type": "Person",
		name: AUTHOR_NAME,
		url: AUTHOR_URL,
	},
});

export default organizationJsonLd;
