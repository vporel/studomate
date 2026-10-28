import { createGenerateMetadata } from "@/app/metadata";
import { toLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import PageTitle from "@/ui/components/public-pages/PageTitle";
import { Box, Container, Typography } from "@mui/material";
import { getTranslations, setRequestLocale } from "next-intl/server";
import TrainingPageFooter from "../TrainingPageFooter";
import GlossaryBrowser from "./GlossaryBrowser";
import buildGlossaryJsonLd from "./glossaryJsonLd";
import { buildGlossaryEntries, buildGlossarySections } from "./glossary-view";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = createGenerateMetadata(
	"/training/glossary",
	"glossaryTitle",
	"glossaryDescription",
);

export default async function Glossary({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const tMeta = await getTranslations({ locale, namespace: "public.metadata" });
	const messages = getMessages(locale).glossary;
	const { pageTitle, intro } = messages;
	const labels = {
		searchLabel: messages.searchLabel,
		searchPlaceholder: messages.searchPlaceholder,
		filterLabel: messages.filterLabel,
		filterAll: messages.filterAll,
		noResults: messages.noResults,
		aliasesLabel: messages.aliasesLabel,
		relatedLabel: messages.relatedLabel,
		resultsOne: messages.resultsOne,
		resultsOther: messages.resultsOther,
	};
	const sections = buildGlossarySections(locale);
	const entries = buildGlossaryEntries(locale);

	return (
		<Container maxWidth="md" sx={{ my: 4 }}>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: buildGlossaryJsonLd(
						locale,
						pageTitle,
						tMeta("glossaryDescription"),
						entries,
					),
				}}
			/>
			<Box mb={4}>
				<PageTitle>{pageTitle}</PageTitle>
				<Typography textAlign="justify" color="text.secondary">
					{intro}
				</Typography>
			</Box>
			<GlossaryBrowser sections={sections} entries={entries} labels={labels} />
			<TrainingPageFooter />
		</Container>
	);
}
