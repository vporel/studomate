import { toLocale } from "@/i18n/config";
import PageTitle from "@/ui/components/public-pages/PageTitle";
import { createGenerateMetadata } from "@/app/metadata";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import { Container, Divider, Typography } from "@mui/material";
import { getTranslations, setRequestLocale } from "next-intl/server";
import LegalArticle, { LegalList, renderStrong } from "../legal/LegalArticle";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = createGenerateMetadata(
	"/privacy",
	"privacyTitle",
	"privacyDescription",
);

export default async function PrivacyPolicy({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "public.privacy" });

	return (
		<Container maxWidth="md" sx={{ my: 4 }}>
			<PageTitle>
				{t("title")}
			</PageTitle>
			<Typography>{t("lastUpdated")}</Typography>
			<Divider sx={{ my: 2 }} />

			<LegalArticle title={t("introTitle")}>
				<Typography textAlign="justify">
					{renderStrong(t.raw("introBody"))}
				</Typography>
			</LegalArticle>
			<LegalArticle title={t("collectedTitle")}>
				<Typography textAlign="justify">
					{renderStrong(t.raw("collectedBody"))}
				</Typography>
			</LegalArticle>
			<LegalArticle title={t("analyticsTitle")}>
				<Typography textAlign="justify">
					{renderStrong(t.raw("analyticsBody"))}
				</Typography>
			</LegalArticle>

			<LegalArticle title={t("accountsTitle")}>
				<Typography textAlign="justify">
					{renderStrong(t.raw("accountsBody"))}
				</Typography>
				<LegalList items={t.raw("accountsItems") as string[]} />
				<Typography textAlign="justify" mt={1}>
					{renderStrong(t.raw("accountsHosting"))}
				</Typography>
			</LegalArticle>

			<LegalArticle title={t("securityTitle")}>
				{t("securityBody")}
			</LegalArticle>
			<LegalArticle title={t("cookiesTitle")}>{t("cookiesBody")}</LegalArticle>

			<LegalArticle title={t("rightsTitle")}>
				<Typography textAlign="justify">{t("rightsBody")}</Typography>
				<LegalList items={t.raw("rightsItems") as string[]} />
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
