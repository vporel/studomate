import { toLocale } from "@/i18n/config";
import { pageMetadata } from "@/i18n/metadata";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import { Box, Container, Divider, Stack, Typography } from "@mui/material";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ModuleStepper, { StepData } from "../ModuleStepper";
import M1_STEP_IDS from "./step-ids";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	const t = await getTranslations({ locale, namespace: "public.metadata" });
	return pageMetadata(
		locale,
		"/training/m1",
		t("trainingM1Title"),
		t("trainingM1Description"),
	);
}

export default async function TrainingM1({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "training" });

	const steps: StepData[] = [
		{
			id: M1_STEP_IDS.grafcetDefinition,
			kind: "theory",
			title: t("grafcetDefinitionTitle"),
			body: t.raw("grafcetDefinitionBody") as string[],
		},
		{
			id: M1_STEP_IDS.theory,
			kind: "theory",
			title: t("theoryTitle"),
			body: t.raw("theoryBody") as string[],
		},
		{
			id: M1_STEP_IDS.theoryActions,
			kind: "theory",
			title: t("theoryActionsTitle"),
			body: t.raw("theoryActionsBody") as string[],
		},
		{
			id: M1_STEP_IDS.exerciseLinear,
			kind: "exercise",
			title: t("exerciseLinearTitle"),
			body: t.raw("exerciseLinearBody") as string[],
			cta: {
				templateId: "linear-sequence",
				exerciseLabel: t("exerciseLinearCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: M1_STEP_IDS.theoryTimer,
			kind: "theory",
			title: t("theoryTimerTitle"),
			body: t.raw("theoryTimerBody") as string[],
		},
		{
			id: M1_STEP_IDS.synthesisTrafficLight,
			kind: "synthesis",
			title: t("synthesisTrafficLightTitle"),
			body: t.raw("synthesisTrafficLightBody") as string[],
			cta: {
				templateId: "traffic-light",
				exerciseLabel: t("ctaExercise"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: M1_STEP_IDS.theoryOrDivergence,
			kind: "theory",
			title: t("theoryOrDivergenceTitle"),
			body: t.raw("theoryOrDivergenceBody") as string[],
		},
		{
			id: M1_STEP_IDS.exerciseOrDivergence,
			kind: "exercise",
			title: t("exerciseOrDivergenceTitle"),
			body: t.raw("exerciseOrDivergenceBody") as string[],
			cta: {
				templateId: "or-divergence",
				exerciseLabel: t("exerciseOrDivergenceCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: M1_STEP_IDS.exerciseAndDivergence,
			kind: "exercise",
			title: t("theoryAndDivergenceTitle"),
			body: t.raw("theoryAndDivergenceBody") as string[],
			cta: {
				templateId: "and-divergence",
				exerciseLabel: t("exerciseAndDivergenceCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: M1_STEP_IDS.synthesisParking,
			kind: "synthesis",
			title: t("synthesisParkingTitle"),
			body: t.raw("synthesisParkingBody") as string[],
			cta: {
				templateId: "parking",
				exerciseLabel: t("ctaExercise"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: M1_STEP_IDS.synthesisCrossroads,
			kind: "synthesis",
			title: t("synthesisCrossroadsTitle"),
			body: t.raw("synthesisCrossroadsBody") as string[],
			cta: {
				templateId: "crossroads",
				exerciseLabel: t("ctaExercise"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: M1_STEP_IDS.readingErrors,
			kind: "theory",
			title: t("readingErrorsTitle"),
			body: t.raw("readingErrorsBody") as string[],
		},
	];

	return (
		<Container maxWidth="lg" sx={{ my: 4 }}>
			<Box maxWidth={720}>
				<Typography variant="h2" component="h1" color="primary" gutterBottom>
					{t("m1PageTitle")}
				</Typography>
				<Divider sx={{ my: 2 }} />
				<Typography textAlign="justify" color="text.secondary" mb={4}>
					{t("m1Intro")}
				</Typography>
			</Box>

			<ModuleStepper
				steps={steps}
				prevLabel={t("previousStep")}
				nextLabel={t("nextStep")}
				moduleId="m1"
			/>

			<Divider sx={{ my: 4 }} />
			<Stack direction="row" gap={2} flexWrap="wrap">
				<PublicLink href="/training">{t("backToTraining")}</PublicLink>
				<PublicLink href="/">{t("backHome")}</PublicLink>
			</Stack>
		</Container>
	);
}
