import { APP_NAME, APP_SHORT_DESCRIPTION } from "@/app-info";
import RootDocument from "@/app/RootDocument";
import { rootMetadata, rootViewport } from "@/app/root-metadata";
import MobileGuard from "@/ui/components/MobileGuard";
import type { Metadata } from "next";
import { OG_IMAGES, OG_IMAGE_PATH } from "../og-image";
import routes from "../routes";

const title = `Application ${APP_NAME} : GRAFCET, Ladder et HMI en ligne`;

export const viewport = rootViewport;

export const metadata: Metadata = {
	...rootMetadata,
	title,
	description: APP_SHORT_DESCRIPTION,
	alternates: { canonical: routes.app() },
	openGraph: {
		type: "website",
		locale: "fr_FR",
		url: routes.app(),
		siteName: APP_NAME,
		title,
		description: APP_SHORT_DESCRIPTION,
		images: OG_IMAGES,
	},
	twitter: {
		card: "summary_large_image",
		title,
		description: APP_SHORT_DESCRIPTION,
		images: [OG_IMAGE_PATH],
	},
};

export default function AppLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<RootDocument lang="fr">
			<MobileGuard>
				<div id="boot-splash" aria-hidden="true" />
				{children}
			</MobileGuard>
		</RootDocument>
	);
}
