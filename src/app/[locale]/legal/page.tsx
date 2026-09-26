import { APP_CONTACT_EMAIL, AUTHOR_NAME, AUTHOR_URL } from "@/app-info";
import PageTitle from "@/ui/components/public-pages/PageTitle";
import { toLocale } from "@/i18n/config";
import { createGenerateMetadata } from "@/app/metadata";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import { Container, Divider, Link as MuiLink, Typography } from "@mui/material";
import { getTranslations, setRequestLocale } from "next-intl/server";
import LegalArticle, { renderStrong } from "./LegalArticle";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = createGenerateMetadata(
	"/legal",
	"legalTitle",
	"legalDescription",
);

export default async function LegalNotice({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "public.legal" });

	return (
		<Container maxWidth="md" sx={{ my: 4 }}>
			<PageTitle>
				{t("title")}
			</PageTitle>
			<Typography>{t("lastUpdated")}</Typography>
			<Divider sx={{ my: 2 }} />

			<LegalArticle title={t("editorTitle")}>
				<Typography textAlign="justify">
					{renderStrong(t.raw("editorBody"))}
				</Typography>
				<Typography textAlign="justify" mt={1}>
					{t("editorResponsible")}{" "}
					<MuiLink href={AUTHOR_URL} target="_blank" rel="noopener noreferrer">
						{AUTHOR_NAME}
					</MuiLink>{" "}
					({APP_CONTACT_EMAIL})
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
