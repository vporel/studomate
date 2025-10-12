import { ProjectContextProvider } from "@/components/projects/ProjectContext";
import { APP_NAME, APP_SHORT_DESCRIPTION } from "@/constants";
import { ThemeProvider } from "@/theme/ThemeContext";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<ThemeProvider>
					<ProjectContextProvider>{children}</ProjectContextProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
