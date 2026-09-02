import { toLocale } from "@/i18n/config";
import { pageMetadata } from "@/i18n/metadata";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import { Container, Divider, Typography } from "@mui/material";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import LegalArticle, { LegalList, renderStrong } from "../legal/LegalArticle";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	const t = await getTranslations({ locale, namespace: "public.metadata" });
	return pageMetadata(
		locale,
		"/privacy",
		t("privacyTitle"),
		t("privacyDescription"),
	);
}

export default async function PrivacyPolicy({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "public.privacy" });

	return (
		<Container maxWidth="md" sx={{ my: 4 }}>
			<Typography variant="h2" component="h1" color="primary" gutterBottom>
				{t("title")}
			</Typography>
			<Typography>{t("lastUpdated")}</Typography>
			<Divider sx={{ my: 2 }} />

			<LegalArticle title={t("introTitle")}>
				<Typography textAlign="justify">
					{renderStrong(t("introBody"))}
				</Typography>
			</LegalArticle>
			<LegalArticle title={t("collectedTitle")}>
				<Typography textAlign="justify">
					{renderStrong(t("collectedBody"))}
				</Typography>
			</LegalArticle>
			<LegalArticle title={t("analyticsTitle")}>
				<Typography textAlign="justify">
					{renderStrong(t("analyticsBody"))}
				</Typography>
			</LegalArticle>

			<LegalArticle title={t("accountsTitle")}>
				<Typography textAlign="justify">
					{renderStrong(t("accountsBody"))}
				</Typography>
				<LegalList items={t.raw("accountsItems") as string[]} />
				<Typography textAlign="justify" mt={1}>
					{renderStrong(t("accountsHosting"))}
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
