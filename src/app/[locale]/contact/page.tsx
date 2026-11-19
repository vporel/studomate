import { APP_CONTACT_EMAIL, APP_REPO_URL, AUTHOR_NAME } from "@/app-info";
import PageTitle from "@/ui/components/public-pages/PageTitle";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import ContactFormFromUrl from "@/ui/components/public-pages/contact/ContactFormFromUrl";
import { toLocale } from "@/i18n/config";
import { createGenerateMetadata } from "@/app/metadata";
import { Box, Container, Divider, Typography } from "@mui/material";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ClientMessagesProvider from "../ClientMessagesProvider";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = createGenerateMetadata(
	"/contact",
	"contactTitle",
	"contactDescription",
);

const linkSx = { color: "primary.main" };

export default async function Contact({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "public.contact" });

	return (
		<Container maxWidth="md" sx={{ my: 4, minHeight: "70vh" }}>
			<PageTitle>{t("title")}</PageTitle>
			<Divider sx={{ my: 2 }} />
			<Typography mb={3}>{t("intro", { author: AUTHOR_NAME })}</Typography>

			<Typography variant="h5" component="h2" mb={1}>
				{t("beforeTitle")}
			</Typography>
			<Box component="ul" sx={{ mt: 0, mb: 3, pl: 3 }}>
				<Typography component="li" mb={1}>
					{t.rich("beforeQuestion", {
						manual: (chunks) => (
							<PublicLink href="/user-manual">{chunks}</PublicLink>
						),
						training: (chunks) => (
							<PublicLink href="/training">{chunks}</PublicLink>
						),
					})}
				</Typography>
				<Typography component="li">
					{t.rich("beforeContribution", {
						github: (chunks) => (
							<Box
								component="a"
								href={APP_REPO_URL}
								target="_blank"
								rel="noopener noreferrer"
								sx={linkSx}
							>
								{chunks}
							</Box>
						),
					})}
				</Typography>
			</Box>

			<Typography variant="h5" component="h2" mb={2}>
				{t("formTitle")}
			</Typography>
			<ClientMessagesProvider namespaces={["public.contact.form"]}>
				<ContactFormFromUrl />
			</ClientMessagesProvider>

			<Typography mt={3} color="text.secondary">
				{t.rich("directEmail", {
					email: () => (
						<Box component="a" href={`mailto:${APP_CONTACT_EMAIL}`} sx={linkSx}>
							{APP_CONTACT_EMAIL}
						</Box>
					),
				})}
			</Typography>
		</Container>
	);
}
