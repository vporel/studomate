import { routing } from "@/i18n/routing";
import Footer from "@/ui/components/public-pages/Footer";
import Header from "@/ui/components/public-pages/Header";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import SyncHtmlLang from "./SyncHtmlLang";
import organizationJsonLd from "./organizationJsonLd";

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
		<NextIntlClientProvider>
			<SyncHtmlLang locale={locale} />
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: organizationJsonLd }}
			/>
			<Header />
			<main>{children}</main>
			<Footer />
		</NextIntlClientProvider>
	);
}
