import { APP_NAME, APP_SHORT_DESCRIPTION } from "@/app-info";
import type { MetadataRoute } from "next";
import routes from "./routes";
import { THEME_COLOR } from "./root-metadata";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: APP_NAME,
		short_name: APP_NAME,
		description: APP_SHORT_DESCRIPTION,
		id: routes.app(),
		start_url: routes.app(),
		display: "standalone",
		background_color: "#ffffff",
		theme_color: THEME_COLOR,
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
			{
				src: "/images/icon-maskable-192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: "/images/icon-maskable-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	};
}
