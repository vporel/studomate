import { APP_NAME, APP_SHORT_DESCRIPTION } from "@/app-info";
import type { MetadataRoute } from "next";
import routes from "./routes";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: APP_NAME,
		short_name: APP_NAME,
		description: APP_SHORT_DESCRIPTION,
		start_url: routes.app(),
		display: "standalone",
		background_color: "#ffffff",
		theme_color: "#1976d2",
		icons: [
			{
				src: "/images/icon-192.png",
				sizes: "192x192",
				type: "image/png",
			},
			{
				src: "/images/icon-512.png",
				sizes: "512x512",
				type: "image/png",
			},
		],
	};
}
