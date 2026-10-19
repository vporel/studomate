import { toLocale } from "@/i18n/config";
import { createGenerateMetadata } from "@/app/metadata";
import {
	featureKeys,
	showcaseKeys,
} from "@/ui/components/public-pages/landing-content";
import LandingPage from "@/ui/components/public-pages/LandingPage";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ClientMessagesProvider from "./ClientMessagesProvider";
import buildHomeJsonLd from "./homeJsonLd";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = createGenerateMetadata(
	"/",
	"homeTitle",
	"homeDescription",
	{ absoluteTitle: true },
);

export default async function Home({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const [t, tLanding] = await Promise.all([
		getTranslations({ locale, namespace: "public.metadata" }),
		getTranslations({ locale, namespace: "public.landing" }),
	]);
	const featureList = [...showcaseKeys, ...featureKeys].map((key) =>
		tLanding(`${key}Title`),
	);

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: buildHomeJsonLd(locale, t("homeDescription"), featureList),
				}}
			/>
			<ClientMessagesProvider
				namespaces={["public.landing", "public.metadata", "templates"]}
			>
				<LandingPage />
			</ClientMessagesProvider>
		</>
	);
}
