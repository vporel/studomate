import { toLocale } from "@/i18n/config";
import { pageMetadata } from "@/i18n/metadata";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import { Box, Container, Divider, Typography } from "@mui/material";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { renderStrong } from "../legal/LegalArticle";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	const t = await getTranslations({ locale, namespace: "public.metadata" });
	return pageMetadata(locale, "/about", t("aboutTitle"), t("aboutDescription"));
}

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
			<Typography variant="h2" component="h1" color="primary" gutterBottom>
				{t("title")}
			</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h3" gutterBottom mt={3}>
				{t("missionTitle")}
			</Typography>
			<Typography textAlign="justify">
				{renderStrong(t("missionBody"))}
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
