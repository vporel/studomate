import {
	APP_NAME,
	APP_SHORT_DESCRIPTION,
	APP_URL,
	AUTHOR_NAME,
	AUTHOR_URL,
} from "@/app-info";
import type { Metadata, Viewport } from "next";
import { OG_IMAGES, OG_IMAGE_PATH } from "./og-image";

export const THEME_COLOR = "#1976d2";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? APP_URL;

export function siteVerification(
	google: string | undefined,
	bing: string | undefined,
): Metadata["verification"] {
	if (!google && !bing) return undefined;
	return {
		...(google ? { google } : {}),
		...(bing ? { other: { "msvalidate.01": bing } } : {}),
	};
}

export const rootMetadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: APP_NAME,
	description: APP_SHORT_DESCRIPTION,
	icons: {
		icon: "/images/favicon.ico",
		shortcut: "/images/favicon.ico",
		apple: "/images/apple-touch-icon.png",
	},
	authors: [{ name: AUTHOR_NAME, url: AUTHOR_URL }],
	creator: "Vivian NKOUANANG (vporel)",
	verification: siteVerification(
		process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
		process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
	),
	openGraph: {
		type: "website",
		locale: "fr_FR",
		url: "/",
		siteName: APP_NAME,
		title: APP_NAME,
		description: APP_SHORT_DESCRIPTION,
		images: OG_IMAGES,
	},
	twitter: {
		card: "summary_large_image",
		title: APP_NAME,
		description: APP_SHORT_DESCRIPTION,
		images: [OG_IMAGE_PATH],
	},
};

export const rootViewport: Viewport = {
	colorScheme: "light",
	themeColor: THEME_COLOR,
};
