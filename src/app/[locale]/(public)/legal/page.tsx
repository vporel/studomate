import { toLocale } from "@/i18n/config";
import { pageMetadata } from "@/i18n/metadata";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import { Container, Divider, Typography } from "@mui/material";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import LegalArticle, { renderStrong } from "./LegalArticle";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	const t = await getTranslations({ locale, namespace: "public.metadata" });
	return pageMetadata(locale, "/legal", t("legalTitle"), t("legalDescription"));
}

export default async function LegalNotice({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "public.legal" });

	return (
		<Container maxWidth="md" sx={{ my: 4 }}>
			<Typography variant="h2" component="h1" color="primary" gutterBottom>
				{t("title")}
			</Typography>
			<Typography>{t("lastUpdated")}</Typography>
			<Divider sx={{ my: 2 }} />

			<LegalArticle title={t("editorTitle")}>
				<Typography textAlign="justify">
					{renderStrong(t("editorBody"))}
				</Typography>
			</LegalArticle>
			<LegalArticle title={t("ipTitle")}>{t("ipBody")}</LegalArticle>
			<LegalArticle title={t("liabilityTitle")}>
				{t("liabilityBody")}
			</LegalArticle>
			<LegalArticle title={t("dataTitle")}>{t("dataBody")}</LegalArticle>

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
