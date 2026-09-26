import { APP_CONTACT_EMAIL } from "@/app-info";
import PageTitle from "@/ui/components/public-pages/PageTitle";
import { toLocale } from "@/i18n/config";
import { createGenerateMetadata } from "@/app/metadata";
import { Box, Container, Divider, Typography } from "@mui/material";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = createGenerateMetadata(
	"/contact",
	"contactTitle",
	"contactDescription",
);

export default async function Contact({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "public.contact" });

	return (
		<Container maxWidth="md" sx={{ my: 4, minHeight: "70vh" }}>
			<PageTitle>
				{t("title")}
			</PageTitle>
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
