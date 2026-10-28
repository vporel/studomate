import { APP_NAME } from "@/app-info";
import type { LocalizedHref } from "@/app/metadata";
import type { Locale } from "@/i18n/config";
import { TRAINING_MODULE_IDS, type TrainingModuleId } from "@/training/module-ids";

export const OG_IMAGE_PATH = "/images/og.png";

export const OG_IMAGES = [
	{ url: OG_IMAGE_PATH, width: 1200, height: 630, alt: APP_NAME },
];

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

/** Family of pages sharing a generated share image. */
export type OgImageKey =
	| "default"
	| "training"
	| "glossary"
	| "manual"
	| TrainingModuleId;

export const OG_IMAGE_KEYS: readonly OgImageKey[] = [
	"default",
	"training",
	"glossary",
	"manual",
	...TRAINING_MODULE_IDS,
];

const MODULE_PATH = /^\/training\/(a\d)(\/|$)/;

/** Share-image family of the page at `href`, from its internal pathname. */
export function ogImageKey(href: LocalizedHref, locale: Locale): OgImageKey {
	const resolved = typeof href === "function" ? href(locale) : href;
	const pathname = typeof resolved === "string" ? resolved : resolved.pathname;

	if (pathname === "/training") return "training";
	if (pathname === "/training/glossary") return "glossary";
	if (pathname === "/user-manual" || pathname.startsWith("/user-manual/"))
		return "manual";
	const moduleId = MODULE_PATH.exec(pathname)?.[1];
	if (moduleId && (TRAINING_MODULE_IDS as readonly string[]).includes(moduleId))
		return moduleId as TrainingModuleId;
	return "default";
}

/** Path of the generated share image of a family, in `locale`. */
export function ogImageUrl(locale: Locale, key: OgImageKey): string {
	return `/api/og/${locale}/${key}`;
}
