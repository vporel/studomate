import MobileGuard from "@/ui/components/MobileGuard";
import { APP_NAME, APP_SHORT_DESCRIPTION } from "@/ui/constants";
import { ThemeProvider } from "@/ui/theme/ThemeContext";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
	title: APP_NAME,
	description: APP_SHORT_DESCRIPTION,
	icons: {
		icon: "/images/favicon.ico",
	},
	authors: [{ name: "Studomate", url: "" }],
	creator: "Vivian NKOUANANG (vporel)",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable}`}
				style={{ backgroundColor: "white" }}
			>
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
					<MobileGuard>
						{children}
						<ToastContainer position="bottom-right" />
					</MobileGuard>
				</ThemeProvider>
			</body>
		</html>
	);
}
