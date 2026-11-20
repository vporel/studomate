import type { Locale } from "@/i18n/config";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import { Alert } from "@mui/material";
import { getTranslations } from "next-intl/server";

/** On a translated legal page, states that the French version is the binding one and links to it. */
export default async function LegalTranslationNotice({
	locale,
	href,
}: {
	locale: Locale;
	href: "/legal" | "/terms" | "/privacy";
}) {
	if (locale === "fr") return null;
	const t = await getTranslations({
		locale,
		namespace: "public.legalTranslationNotice",
	});
	return (
		<Alert severity="info" sx={{ mb: 2 }}>
			{t("text")}{" "}
			<PublicLink href={href} locale="fr">
				{t("link")}
			</PublicLink>
		</Alert>
	);
}
