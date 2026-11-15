import { createGenerateMetadata } from "@/app/metadata";
import routes from "@/app/routes";
import { toLocale } from "@/i18n/config";
import { TRAINING_MODULE_IDS } from "@/training/module-ids";
import PageTitle from "@/ui/components/public-pages/PageTitle";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import PublicLinkButton from "@/ui/components/public-pages/PublicLinkButton";
import TintedPaper from "@/ui/components/public-pages/TintedPaper";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Box, Button, Container, Divider, Typography } from "@mui/material";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { moduleEntryPathname } from "../training/training-modules";
import buildFaqJsonLd, { type FaqItem } from "./faqJsonLd";

type Props = { params: Promise<{ locale: string }> };

type Section = { title: string; items: string[] };

export const generateMetadata = createGenerateMetadata(
	"/teachers",
	"teachersTitle",
	"teachersDescription",
);

const SectionTitle = ({ children }: { children: ReactNode }) => (
	<Typography variant="h3" component="h2" gutterBottom mt={5}>
		{children}
	</Typography>
);

const BulletList = ({ items }: { items: ReactNode[] }) => (
	<Box component="ul" sx={{ pl: 3, my: 0 }}>
		{items.map((item, i) => (
			<Typography key={i} component="li" mb={1}>
				{item}
			</Typography>
		))}
	</Box>
);

export default async function Teachers({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "public.teachers" });
	const tLanding = await getTranslations({
		locale,
		namespace: "public.landing",
	});

	const sections = t.raw("sections") as Section[];
	const faq = t.raw("faq") as FaqItem[];
	const trainingLinks = [
		...TRAINING_MODULE_IDS.map((id) => (
			<PublicLink key={id} href={moduleEntryPathname(id)}>
				{tLanding(`training${id.toUpperCase() as "A1"}LinkLabel`)}
			</PublicLink>
		)),
		<PublicLink key="glossary" href="/training/glossary">
			{t("glossaryLink")}
		</PublicLink>,
	];

	return (
		<Container maxWidth="md" sx={{ my: 4 }}>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: buildFaqJsonLd(locale, faq) }}
			/>
			<PageTitle>{t("title")}</PageTitle>
			<Typography fontSize="1.1rem">{t("intro")}</Typography>
			<Divider sx={{ my: 2 }} />

			{sections.map((section) => (
				<Box component="section" key={section.title}>
					<SectionTitle>{section.title}</SectionTitle>
					<BulletList items={section.items} />
				</Box>
			))}

			<Box component="section">
				<SectionTitle>{t("trainingTitle")}</SectionTitle>
				<Typography mb={2}>{t("trainingBody")}</Typography>
				<BulletList items={trainingLinks} />
			</Box>

			<Box component="section">
				<SectionTitle>{t("faqTitle")}</SectionTitle>
				{faq.map(({ question, answer }) => (
					<Box key={question} mt={3}>
						<Typography variant="h6" component="h3" fontWeight={700}>
							{question}
						</Typography>
						<Typography mt={0.5}>{answer}</Typography>
					</Box>
				))}
			</Box>

			<TintedPaper sx={{ mt: 5, p: 3, textAlign: "center" }}>
				<Typography variant="h3" component="h2" gutterBottom>
					{t("ctaTitle")}
				</Typography>
				<Typography mb={2}>{t("ctaBody")}</Typography>
				<Box
					sx={{
						display: "flex",
						flexWrap: "wrap",
						justifyContent: "center",
						gap: 2,
					}}
				>
					<Button
						component="a"
						href={routes.app()}
						variant="contained"
						startIcon={<PlayArrowIcon />}
					>
						{tLanding("openApp")}
					</Button>
					<PublicLinkButton href="/training" variant="outlined">
						{t("ctaTraining")}
					</PublicLinkButton>
				</Box>
			</TintedPaper>
		</Container>
	);
}
