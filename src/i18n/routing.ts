import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "./config";

/**
 * Routing des **pages publiques** (`src/app/[locale]/`). L'app `/app` est hors de ce
 * routing (SPA, langue en `localStorage`) — le middleware l'exclut de son `matcher`.
 *
 * `localePrefix: "as-needed"` : le français (défaut) reste sans préfixe (`/a-propos`), l'anglais
 * est préfixé (`/en/about`). Les slugs sont traduits par langue (meilleur SEO) ; la clé de
 * `pathnames` est le chemin **interne** (nom du dossier sous `[locale]/`).
 */
export const routing = defineRouting({
	locales: LOCALES,
	defaultLocale: DEFAULT_LOCALE,
	localePrefix: "as-needed",
	localeDetection: false,
	pathnames: {
		"/": "/",
		"/about": { fr: "/a-propos", en: "/about" },
		"/contact": { fr: "/contact", en: "/contact" },
		"/legal": { fr: "/mentions-legales", en: "/legal" },
		"/terms": { fr: "/conditions-d-utilisation", en: "/terms" },
		"/privacy": { fr: "/politique-de-confidentialite", en: "/privacy" },
		"/user-manual": { fr: "/manuel-utilisateur", en: "/user-manual" },
		"/training": { fr: "/formations", en: "/training" },
		"/training/a0": { fr: "/formations/a0", en: "/training/a0" },
		"/training/a1": { fr: "/formations/a1", en: "/training/a1" },
	},
});

export type PublicPathname = keyof typeof routing.pathnames;
