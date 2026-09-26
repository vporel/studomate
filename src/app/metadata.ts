import { APP_URL } from "@/app-info";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { toLocale, type Locale } from "@/i18n/config";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import type { PublicPathname } from "@/i18n/routing";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? APP_URL;

const OG_LOCALES: Record<Locale, string> = {
	fr: "fr_FR",
	en: "en_US",
};

export function absolute(locale: Locale, pathname: PublicPathname): string {
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

type MetadataMessageKey = Parameters<
	Awaited<ReturnType<typeof getTranslations<"public.metadata">>>
>[0];

/**
 * `generateMetadata` of a public page: title and description are read from the
 * `public.metadata` messages under the given keys.
 */
export function createGenerateMetadata(
	pathname: PublicPathname,
	titleKey: MetadataMessageKey,
	descriptionKey: MetadataMessageKey,
) {
	return async ({
		params,
	}: {
		params: Promise<{ locale: string }>;
	}): Promise<Metadata> => {
		const locale = toLocale((await params).locale);
		const t = await getTranslations({ locale, namespace: "public.metadata" });
		return pageMetadata(locale, pathname, t(titleKey), t(descriptionKey));
	};
}
