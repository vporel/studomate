import { absolute, type LocalizedHref } from "@/app/metadata";
import { serializeJsonLd } from "@/app/[locale]/json-ld";
import type { Locale } from "@/i18n/config";
import type { PublicPathname } from "@/i18n/routing";

export type BreadcrumbAncestor = { label: string; href: PublicPathname };
export type BreadcrumbCurrent = { label: string; href: LocalizedHref };

/** JSON-LD `BreadcrumbList`: the ancestors in order, then the current page when there is one. */
export default function buildBreadcrumbJsonLd(
	locale: Locale,
	ancestors: BreadcrumbAncestor[],
	current?: BreadcrumbCurrent,
): string {
	const items = [...ancestors, ...(current ? [current] : [])];
	return serializeJsonLd({
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map(({ label, href }, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: label,
			item: absolute(locale, href),
		})),
	});
}
