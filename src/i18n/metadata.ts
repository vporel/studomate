import { APP_URL } from "@/app-info";
import type { Metadata } from "next";
import type { Locale } from "./config";
import { getPathname } from "./navigation";
import { routing } from "./routing";
import type { PublicPathname } from "./routing";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? APP_URL;

const OG_LOCALES: Record<Locale, string> = {
	fr: "fr_FR",
	en: "en_US",
};

function absolute(locale: Locale, pathname: PublicPathname): string {
	return new URL(getPathname({ locale, href: pathname }), siteUrl).toString();
}

/**
 * Métadonnées SEO d'une page publique localisée : `canonical`, `hreflang` (`alternates.languages`)
 * et `og:locale` / `og:locale:alternate`. `pathname` est le chemin **interne**
 * (`routing.pathnames`), résolu vers le slug traduit de chaque langue.
 */
export function pageMetadata(
	locale: string,
	pathname: PublicPathname,
	title: string,
	description: string,
): Metadata {
	const current = locale as Locale;
	const languages = Object.fromEntries(
		routing.locales.map((l) => [l, absolute(l, pathname)]),
	);

	return {
		title,
		description,
		alternates: {
			canonical: absolute(current, pathname),
			languages,
		},
		openGraph: {
			title,
			description,
			url: absolute(current, pathname),
			locale: OG_LOCALES[current],
			alternateLocale: routing.locales
				.filter((l) => l !== current)
				.map((l) => OG_LOCALES[l]),
		},
	};
}
