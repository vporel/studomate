import { toLocale } from "@/i18n/config";
import PageTitle from "@/ui/components/public-pages/PageTitle";
import { createGenerateMetadata } from "@/app/metadata";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import { Container, Divider, Typography } from "@mui/material";
import { getTranslations, setRequestLocale } from "next-intl/server";
import LegalArticle, { LegalList, renderStrong } from "../legal/LegalArticle";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = createGenerateMetadata(
	"/terms",
	"termsTitle",
	"termsDescription",
);

export default async function TermsOfUse({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "public.terms" });

	return (
		<Container maxWidth="md" sx={{ my: 4 }}>
			<PageTitle>
				{t("title")}
			</PageTitle>
			<Typography>{t("lastUpdated")}</Typography>
			<Divider sx={{ my: 2 }} />

			<LegalArticle title={t("purposeTitle")}>
				<Typography textAlign="justify">
					{renderStrong(t.raw("purposeBody"))}
				</Typography>
			</LegalArticle>

			<LegalArticle title={t("usageTitle")}>
				<Typography textAlign="justify">{t("usageBody")}</Typography>
				<LegalList items={t.raw("usageItems") as string[]} />
			</LegalArticle>

			<LegalArticle title={t("accountsTitle")}>
				<Typography textAlign="justify">
					{renderStrong(t.raw("accountsBody"))}
				</Typography>
			</LegalArticle>
			<LegalArticle title={t("ipTitle")}>{t("ipBody")}</LegalArticle>
			<LegalArticle title={t("liabilityTitle")}>
				{t("liabilityBody")}
			</LegalArticle>
			<LegalArticle title={t("evolutionTitle")}>
				{t("evolutionBody")}
			</LegalArticle>

			<Typography variant="h3" gutterBottom mt={3}>
				{t("contactTitle")}
			</Typography>
			<Typography>
				{t("contactBody")}{" "}
				<PublicLink href="/contact">{t("contactLink")}</PublicLink>
			</Typography>
		</Container>
	);
}
