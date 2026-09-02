import { APP_URL } from "@/app-info";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import type { PublicPathname } from "@/i18n/routing";
import type { MetadataRoute } from "next";
import routes from "./routes";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? APP_URL;

/** Pages publiques localisées (chemin interne) — une entrée de sitemap par langue. */
const publicPaths: PublicPathname[] = [
	"/",
	"/about",
	"/user-manual",
	"/contact",
	"/legal",
	"/terms",
	"/privacy",
];

export default function sitemap(): MetadataRoute.Sitemap {
	const lastModified = new Date();

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
				lastModified,
				changeFrequency,
				priority: path === "/" ? 1 : 0.7,
				alternates: {
					languages: Object.fromEntries(
						routing.locales.map((l) => [
							l,
							new URL(getPathname({ locale: l, href: path }), siteUrl).toString(),
						]),
					),
				},
			};
		}),
	);

	return [
		{
			url: new URL(routes.app(), siteUrl).toString(),
			lastModified,
			changeFrequency: "monthly",
			priority: 0.7,
		},
		...localizedEntries,
	];
}
