import { APP_URL } from "@/app-info";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { getPathname } from "@/i18n/navigation";
import { routing, type PublicPathname } from "@/i18n/routing";
import type { MetadataRoute } from "next";
import {
	MANUAL_DEFAULT_SECTION,
	MANUAL_SECTIONS,
} from "./[locale]/user-manual/manual-sections";
import { alternateLanguages, type PublicHref } from "./metadata";
import routes from "./routes";
import {
	buildModuleSteps,
	moduleEntryPathname,
	moduleStepPathname,
} from "./[locale]/training/training-modules";
import { TRAINING_MODULE_IDS } from "./[locale]/training/training-module-ids";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? APP_URL;

const moduleEntryPaths = new Set<string>(
	TRAINING_MODULE_IDS.map(moduleEntryPathname),
);

const staticPaths = (
	Object.keys(routing.pathnames) as (keyof typeof routing.pathnames)[]
).filter(
	(pathname): pathname is PublicPathname =>
		!pathname.includes("[") && !moduleEntryPaths.has(pathname),
);

/** Pages publiques localisées (chemin interne) — une entrée de sitemap par langue. */
const publicPaths: PublicHref[] = [
	...staticPaths,
	...MANUAL_SECTIONS.filter((s) => s.id !== MANUAL_DEFAULT_SECTION).map(
		({ id }) => ({
			pathname: "/user-manual/[section]" as const,
			params: { section: id },
		}),
	),
	...TRAINING_MODULE_IDS.flatMap((moduleId) => [
		moduleEntryPathname(moduleId),
		...buildModuleSteps(moduleId, DEFAULT_LOCALE)
			.slice(1)
			.filter((step) => step.kind === "theory")
			.map(({ id }) => ({
				pathname: moduleStepPathname(moduleId),
				params: { step: id },
			})),
	]),
];

export default function sitemap(): MetadataRoute.Sitemap {
	const localizedEntries = publicPaths.flatMap((path) =>
		routing.locales.map((locale) => {
			const url = new URL(
				getPathname({ locale, href: path }),
				siteUrl,
			).toString();
			const changeFrequency: "weekly" | "monthly" =
				path === "/" ? "weekly" : "monthly";
			return {
				url,
				changeFrequency,
				priority: path === "/" ? 1 : 0.7,
				alternates: {
					languages: alternateLanguages(path),
				},
			};
		}),
	);

	return [
		{
			url: new URL(routes.app(), siteUrl).toString(),
			changeFrequency: "monthly",
			priority: 0.7,
		},
		...localizedEntries,
	];
}
