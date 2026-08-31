import { APP_URL } from "@/app-info";
import type { MetadataRoute } from "next";
import routes from "./routes";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? APP_URL;

const paths = [
	routes.home(),
	routes.app(),
	routes.about(),
	routes.userManual(),
	routes.contact(),
	routes.legalMentions(),
	routes.termsOfUse(),
	routes.privacyPolicy(),
];

export default function sitemap(): MetadataRoute.Sitemap {
	const lastModified = new Date();
	return paths.map((path) => ({
		url: new URL(path, siteUrl).toString(),
		lastModified,
		changeFrequency: path === routes.home() ? "weekly" : "monthly",
		priority: path === routes.home() ? 1 : 0.7,
	}));
}
