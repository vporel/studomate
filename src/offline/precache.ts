import { LOCALES } from "@/i18n/config";
import manualPath from "@/app/[locale]/user-manual/manual-path";
import { MANUAL_SECTIONS } from "@/app/[locale]/user-manual/manual-sections";
import routes from "@/app/routes";

export type PrecachePage = { url: string; revision: string };

/**
 * Assets precached for offline use, relative to the project root: the whole Next.js build
 * output, which `/app` and the manual draw from, and the public files they display.
 */
export const PRECACHE_ASSET_GLOBS = [
	".next/static/**/*.{js,css,woff,woff2,ico,png,jpg,jpeg,svg,webp,avif,json}",
	"public/firmwares/arduino/*.hex",
	"public/user-manual/**/*",
	"public/images/scenes-3d/*",
	"public/images/targets/*",
	"public/images/captures-projets/*",
	"public/images/{icon,icon-192,icon-512,icon-maskable-192,icon-maskable-512,apple-touch-icon,logo}.png",
	"public/images/favicon.ico",
];

/** Public URLs (the ones the browser requests) of the manual, in every locale. */
export function manualPagePaths(): string[] {
	return LOCALES.flatMap((locale) =>
		MANUAL_SECTIONS.map((section) => manualPath(locale, section.id)).filter(
			(path): path is string => path !== null,
		),
	);
}

/** Prerendered HTML pages served offline: the app shell, the scene window and the manual. */
export function pagePrecacheEntries(revision: string): PrecachePage[] {
	return [routes.app(), routes.scene(), ...manualPagePaths()].map((url) => ({
		url,
		revision,
	}));
}
