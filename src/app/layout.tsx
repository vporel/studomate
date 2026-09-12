import { APP_NAME, APP_SHORT_DESCRIPTION, APP_URL } from "@/app-info";
import {
	UMAMI_SRC,
	UMAMI_WEBSITE_ID,
	analyticsEnabled,
} from "@/ui/lib/analytics";
import { ThemeProvider } from "@/ui/theme/ThemeContext";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import NextTopLoader from "nextjs-toploader";
import { ToastContainer } from "react-toastify";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? APP_URL;

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: APP_NAME,
	description: APP_SHORT_DESCRIPTION,
	icons: {
		icon: "/images/favicon.ico",
		shortcut: "/images/favicon.ico",
		apple: "/images/apple-touch-icon.png",
	},
	authors: [{ name: "Studomate", url: "" }],
	creator: "Vivian NKOUANANG (vporel)",
	openGraph: {
		type: "website",
		locale: "fr_FR",
		url: "/",
		siteName: APP_NAME,
		title: APP_NAME,
		description: APP_SHORT_DESCRIPTION,
		images: [
			{
				url: "/images/og.png",
				width: 1200,
				height: 630,
				alt: APP_NAME,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: APP_NAME,
		description: APP_SHORT_DESCRIPTION,
		images: ["/images/og.png"],
	},
};

export const viewport: Viewport = {
	colorScheme: "light",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="fr">
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `try{if(/[?&](projectId|shareToken)=/.test(location.search))document.documentElement.classList.add("restoring")}catch(e){}`,
					}}
				/>
			</head>
			<body className={`${geistSans.variable} ${geistMono.variable}`}>
				{analyticsEnabled && (
					<Script
						src={UMAMI_SRC}
						data-website-id={UMAMI_WEBSITE_ID}
						strategy="afterInteractive"
					/>
				)}
				<NextTopLoader
					color={"gray"}
					initialPosition={0.08}
					showSpinner={false}
					crawlSpeed={200}
					height={3}
					crawl={true}
					easing="ease"
					speed={200}
				/>
				<ThemeProvider>
					{children}
					<ToastContainer position="bottom-right" />
				</ThemeProvider>
			</body>
		</html>
	);
}
