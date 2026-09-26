import { toLocale } from "@/i18n/config";
import { createGenerateMetadata } from "@/app/metadata";
import LandingPage from "@/ui/components/public-pages/LandingPage";
import { getTranslations, setRequestLocale } from "next-intl/server";
import buildHomeJsonLd from "./homeJsonLd";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = createGenerateMetadata(
	"/",
	"homeTitle",
	"homeDescription",
);

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
