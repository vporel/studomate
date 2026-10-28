import { APP_NAME } from "@/app-info";
import RootDocument from "@/app/RootDocument";
import { TITLE_TEMPLATE } from "@/app/metadata";
import { rootMetadata, rootViewport } from "@/app/root-metadata";
import { routing } from "@/i18n/routing";
import Footer from "@/ui/components/public-pages/Footer";
import Header from "@/ui/components/public-pages/Header";
import StandaloneBackButton from "@/ui/components/public-pages/StandaloneBackButton";
import WhatsNew from "@/ui/components/whats-new/WhatsNew";
import PUBLIC_PAGES_CLASS from "@/ui/components/public-pages/public-pages-class";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClientMessagesProvider from "./ClientMessagesProvider";
import organizationJsonLd from "./organizationJsonLd";

export const viewport = rootViewport;

export const metadata: Metadata = {
	...rootMetadata,
	title: { template: TITLE_TEMPLATE, default: APP_NAME },
};

export function generateStaticParams() {
	return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	if (!hasLocale(routing.locales, locale)) notFound();
	setRequestLocale(locale);

	return (
		<RootDocument lang={locale}>
			<ClientMessagesProvider
				namespaces={[
					"public.header",
					"public.footer",
					"common.languageSwitch",
					"auth",
					"profile",
					"whatsNew",
				]}
			>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: organizationJsonLd }}
				/>
				<div className={PUBLIC_PAGES_CLASS}>
					<Header />
					<main>{children}</main>
					<Footer />
					<StandaloneBackButton />
					<WhatsNew />
				</div>
			</ClientMessagesProvider>
		</RootDocument>
	);
}
