import { toLocale } from "@/i18n/config";
import { pageMetadata } from "@/i18n/metadata";
import LandingPage from "@/ui/components/public-pages/LandingPage";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import buildHomeJsonLd from "./homeJsonLd";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	const t = await getTranslations({ locale, namespace: "public.metadata" });
	return pageMetadata(locale, "/", t("homeTitle"), t("homeDescription"));
}

export default async function Home({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "public.metadata" });

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: buildHomeJsonLd(locale, t("homeDescription")),
				}}
			/>
			<LandingPage />
		</>
	);
}
