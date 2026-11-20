import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "./config";

/**
 * Routing des **pages publiques** (`src/app/[locale]/`). L'app `/app` est hors de ce
 * routing (SPA, langue en `localStorage`) — le middleware l'exclut de son `matcher`.
 *
 * `localePrefix: "as-needed"` : le français (défaut) reste sans préfixe (`/a-propos`), les autres
 * langues sont préfixées (`/en/about`, `/es/acerca-de`). Les slugs sont traduits par langue (meilleur SEO) ; la clé de
 * `pathnames` est le chemin **interne** (nom du dossier sous `[locale]/`).
 */
export const routing = defineRouting({
	locales: LOCALES,
	defaultLocale: DEFAULT_LOCALE,
	localePrefix: "as-needed",
	localeDetection: false,
	pathnames: {
		"/": "/",
		"/about": { fr: "/a-propos", en: "/about", es: "/acerca-de" },
		"/teachers": { fr: "/enseignants", en: "/teachers", es: "/docentes" },
		"/contact": { fr: "/contact", en: "/contact", es: "/contacto" },
		"/legal": { fr: "/mentions-legales", en: "/legal", es: "/aviso-legal" },
		"/terms": {
			fr: "/conditions-d-utilisation",
			en: "/terms",
			es: "/condiciones-de-uso",
		},
		"/privacy": {
			fr: "/politique-de-confidentialite",
			en: "/privacy",
			es: "/politica-de-privacidad",
		},
		"/user-manual": {
			fr: "/manuel-utilisateur",
			en: "/user-manual",
			es: "/manual-de-usuario",
		},
		"/user-manual/[section]": {
			fr: "/manuel-utilisateur/[section]",
			en: "/user-manual/[section]",
			es: "/manual-de-usuario/[section]",
		},
		"/training": { fr: "/formations", en: "/training", es: "/formacion" },
		"/training/glossary": {
			fr: "/formations/glossaire",
			en: "/training/glossary",
			es: "/formacion/glosario",
		},
		"/training/a0": {
			fr: "/formations/a0",
			en: "/training/a0",
			es: "/formacion/a0",
		},
		"/training/a0/[step]": {
			fr: "/formations/a0/[step]",
			en: "/training/a0/[step]",
			es: "/formacion/a0/[step]",
		},
		"/training/a1": {
			fr: "/formations/a1",
			en: "/training/a1",
			es: "/formacion/a1",
		},
		"/training/a1/[step]": {
			fr: "/formations/a1/[step]",
			en: "/training/a1/[step]",
			es: "/formacion/a1/[step]",
		},
		"/training/a2": {
			fr: "/formations/a2",
			en: "/training/a2",
			es: "/formacion/a2",
		},
		"/training/a2/[step]": {
			fr: "/formations/a2/[step]",
			en: "/training/a2/[step]",
			es: "/formacion/a2/[step]",
		},
		"/training/a3": {
			fr: "/formations/a3",
			en: "/training/a3",
			es: "/formacion/a3",
		},
		"/training/a3/[step]": {
			fr: "/formations/a3/[step]",
			en: "/training/a3/[step]",
			es: "/formacion/a3/[step]",
		},
		"/training/a4": {
			fr: "/formations/a4",
			en: "/training/a4",
			es: "/formacion/a4",
		},
		"/training/a4/[step]": {
			fr: "/formations/a4/[step]",
			en: "/training/a4/[step]",
			es: "/formacion/a4/[step]",
		},
		"/training/a5": {
			fr: "/formations/a5",
			en: "/training/a5",
			es: "/formacion/a5",
		},
		"/training/a5/[step]": {
			fr: "/formations/a5/[step]",
			en: "/training/a5/[step]",
			es: "/formacion/a5/[step]",
		},
	},
});

/** Chemins publics statiques ; les routes dynamiques se donnent en `{ pathname, params }`. */
export type PublicPathname = Exclude<
	keyof typeof routing.pathnames,
	`${string}[${string}]`
>;
