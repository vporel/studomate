import { APP_NAME, APP_URL } from "@/app-info";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE, toLocale, type Locale } from "@/i18n/config";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import type { PublicPathname } from "@/i18n/routing";
import { OG_IMAGE_SIZE, ogImageKey, ogImageUrl } from "./og-image";

/** Origin of the site: `NEXT_PUBLIC_SITE_URL` when set (preview, staging), production otherwise. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? APP_URL;

const OG_LOCALES: Record<Locale, string> = {
	fr: "fr_FR",
	en: "en_US",
};

const TITLE_SEPARATOR = " — ";

export const TITLE_TEMPLATE = `%s${TITLE_SEPARATOR}${APP_NAME}`;

export type PublicHref = Parameters<typeof getPathname>[0]["href"];

/** A public page address; a function when its params differ per locale (translated slugs). */
export type LocalizedHref = PublicHref | ((locale: Locale) => PublicHref);

export function absolute(locale: Locale, href: LocalizedHref): string {
	const resolved = typeof href === "function" ? href(locale) : href;
	return new URL(getPathname({ locale, href: resolved }), SITE_URL).toString();
}

/** `hreflang` of a page: one URL per locale plus `x-default`, the default-locale version. */
export function alternateLanguages(href: LocalizedHref): Record<string, string> {
	return {
		...Object.fromEntries(routing.locales.map((l) => [l, absolute(l, href)])),
		"x-default": absolute(DEFAULT_LOCALE, href),
	};
}

/**
 * Métadonnées SEO d'une page publique localisée : `canonical`, `hreflang` (`alternates.languages`)
 * et `og:locale` / `og:locale:alternate`, plus `og:type`, `og:site_name`, `og:image` et la carte
 * Twitter (un `openGraph` de page remplace celui du layout racine en entier). `pathname` est le
 * chemin **interne** (`routing.pathnames`), résolu vers le slug traduit de chaque langue ; une
 * route dynamique se donne sous la forme `{ pathname, params }`.
 *
 * Le `title` reçoit le suffixe du `title.template` du layout `[locale]`, sauf avec
 * `absoluteTitle` (titre déjà complet). `openGraph` et `twitter` ne passent pas par le template :
 * ils reçoivent toujours le titre complet.
 */
export function pageMetadata(
	locale: string,
	pathname: LocalizedHref,
	title: string,
	description: string,
	{ absoluteTitle = false }: { absoluteTitle?: boolean } = {},
): Metadata {
	const fullTitle = absoluteTitle ? title : TITLE_TEMPLATE.replace("%s", title);
	const current = locale as Locale;
	const image = ogImageUrl(current, ogImageKey(pathname, current));

	return {
		title: absoluteTitle ? { absolute: title } : title,
		description,
		alternates: {
			canonical: absolute(current, pathname),
			languages: alternateLanguages(pathname),
		},
		openGraph: {
			type: "website",
			siteName: APP_NAME,
			title: fullTitle,
			description,
			url: absolute(current, pathname),
			locale: OG_LOCALES[current],
			alternateLocale: routing.locales
				.filter((l) => l !== current)
				.map((l) => OG_LOCALES[l]),
			images: [{ url: image, ...OG_IMAGE_SIZE, alt: fullTitle }],
		},
		twitter: {
			card: "summary_large_image",
			title: fullTitle,
			description,
			images: [image],
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
	options?: { absoluteTitle?: boolean },
) {
	return async ({
		params,
	}: {
		params: Promise<{ locale: string }>;
	}): Promise<Metadata> => {
		const locale = toLocale((await params).locale);
		const t = await getTranslations({ locale, namespace: "public.metadata" });
		return pageMetadata(
			locale,
			pathname,
			t(titleKey),
			t(descriptionKey),
			options,
		);
	};
}
