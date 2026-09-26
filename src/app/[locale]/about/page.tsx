import { toLocale } from "@/i18n/config";
import PageTitle from "@/ui/components/public-pages/PageTitle";
import { createGenerateMetadata } from "@/app/metadata";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import { Box, Container, Divider, Typography } from "@mui/material";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { renderStrong } from "../legal/LegalArticle";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = createGenerateMetadata(
	"/about",
	"aboutTitle",
	"aboutDescription",
);

export default async function About({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "public.about" });

	const list = (key: "offeringItems" | "valueItems" | "audienceItems") => (
		<Box component="ul" sx={{ listStyleType: "disc", pl: 4, pt: 1 }}>
			{(t.raw(key) as string[]).map((item, i) => (
				<li key={i}>{renderStrong(item)}</li>
			))}
		</Box>
	);

	return (
		<Container maxWidth="md" sx={{ my: 4 }}>
			<PageTitle>
				{t("title")}
			</PageTitle>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h3" gutterBottom mt={3}>
				{t("missionTitle")}
			</Typography>
			<Typography textAlign="justify">
				{renderStrong(t.raw("missionBody"))}
			</Typography>
			<Typography textAlign="justify" mt={1}>
				{t("missionBody2")}
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				{t("offeringTitle")}
			</Typography>
			{list("offeringItems")}

			<Typography variant="h3" gutterBottom mt={3}>
				{t("valueTitle")}
			</Typography>
			{list("valueItems")}

			<Typography variant="h3" gutterBottom mt={3}>
				{t("ownershipTitle")}
			</Typography>
			<Typography textAlign="justify">{t("ownershipBody")}</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				{t("audienceTitle")}
			</Typography>
			{list("audienceItems")}

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
