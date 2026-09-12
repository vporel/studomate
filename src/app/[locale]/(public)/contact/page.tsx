import { APP_CONTACT_EMAIL } from "@/app-info";
import { toLocale } from "@/i18n/config";
import { pageMetadata } from "@/i18n/metadata";
import { Box, Container, Divider, Typography } from "@mui/material";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	const t = await getTranslations({ locale, namespace: "public.metadata" });
	return pageMetadata(
		locale,
		"/contact",
		t("contactTitle"),
		t("contactDescription"),
	);
}

export default async function Contact({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "public.contact" });

	return (
		<Container maxWidth="md" sx={{ my: 4, minHeight: "70vh" }}>
			<Typography variant="h2" component="h1" color="primary" gutterBottom>
				{t("title")}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography textAlign="justify">
				{t("name")} : <strong>Vivian NKOUANANG</strong>
			</Typography>
			<Typography textAlign="justify">
				{t("email")} :{" "}
				<Box
					component="a"
					href={`mailto:${APP_CONTACT_EMAIL}`}
					sx={{ color: "primary.main" }}
				>
					{APP_CONTACT_EMAIL}
				</Box>
			</Typography>
		</Container>
	);
}
