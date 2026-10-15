import {
	UMAMI_SRC,
	UMAMI_WEBSITE_ID,
	analyticsEnabled,
} from "@/ui/services/analytics";
import { ThemeProvider } from "@/ui/theme/ThemeContext";
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

/** `<html>` and `<body>` shared by every root layout; `lang` is the language of the served HTML. */
export default function RootDocument({
	lang,
	children,
}: Readonly<{
	lang: string;
	children: React.ReactNode;
}>) {
	return (
		<html lang={lang}>
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
