import { toLocale } from "@/i18n/config";
import { pageMetadata } from "@/i18n/metadata";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import { Box, Container, Divider, Stack, Typography } from "@mui/material";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ModuleStepper, { StepData } from "../ModuleStepper";
import A0_STEP_IDS from "./step-ids";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	const t = await getTranslations({ locale, namespace: "public.metadata" });
	return pageMetadata(
		locale,
		"/training/a0",
		t("trainingA0Title"),
		t("trainingA0Description"),
	);
}

export default async function TrainingA0({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "training" });

	const steps: StepData[] = [
		{
			id: A0_STEP_IDS.automatisme,
			kind: "theory",
			title: t("automatismeTitle"),
			body: t.raw("automatismeBody") as string[],
		},
		{
			id: A0_STEP_IDS.logicBasics,
			kind: "theory",
			title: t("logicBasicsTitle"),
			body: t.raw("logicBasicsBody") as string[],
		},
		{
			id: A0_STEP_IDS.scanCycle,
			kind: "theory",
			title: t("scanCycleTitle"),
			body: t.raw("scanCycleBody") as string[],
			cta: {
				templateId: "traffic-light",
				exerciseLabel: t("scanCycleCta"),
				primaryMode: "solution",
				autostartSimulation: true,
			},
		},
	];

	return (
		<Container maxWidth="lg" sx={{ my: 4 }}>
			<Box maxWidth={720}>
				<Typography variant="h2" component="h1" color="primary" gutterBottom>
					{t("a0PageTitle")}
				</Typography>
				<Divider sx={{ my: 2 }} />
				<Typography textAlign="justify" color="text.secondary" mb={4}>
					{t("a0Intro")}
				</Typography>
			</Box>

			<ModuleStepper
				steps={steps}
				prevLabel={t("previousStep")}
				nextLabel={t("nextStep")}
				moduleId="a0"
				nextModule={{ href: "/training/a1", label: t("nextModuleA1Cta") }}
			/>

			<Box mt={2}>
				<Typography color="text.secondary">
					{t("scanCycleManualLinkPrefix")}{" "}
					<PublicLink href="/user-manual">{t("scanCycleManualLinkLabel")}</PublicLink>.
				</Typography>
			</Box>

			<Divider sx={{ my: 4 }} />
			<Stack direction="row" gap={2} flexWrap="wrap">
				<PublicLink href="/training">{t("backToTraining")}</PublicLink>
				<PublicLink href="/">{t("backHome")}</PublicLink>
			</Stack>
		</Container>
	);
}
