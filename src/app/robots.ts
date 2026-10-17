import { APP_URL } from "@/app-info";
import type { MetadataRoute } from "next";
import routes from "./routes";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? APP_URL;

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: routes.scene(),
		},
		sitemap: `${siteUrl}/sitemap.xml`,
	};
}
