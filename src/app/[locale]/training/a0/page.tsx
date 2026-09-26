import { toLocale } from "@/i18n/config";
import { createGenerateMetadata } from "@/app/metadata";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import { Box, Typography } from "@mui/material";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StepData } from "../ModuleStepper";
import TrainingModulePage from "../TrainingModulePage";
import A0_STEP_IDS from "./step-ids";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = createGenerateMetadata(
	"/training/a0",
	"trainingA0Title",
	"trainingA0Description",
);

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
		<TrainingModulePage
			title={t("a0PageTitle")}
			intro={t("a0Intro")}
			steps={steps}
			moduleId="a0"
			prevLabel={t("previousStep")}
			nextLabel={t("nextStep")}
			nextModule={{ href: "/training/a1", label: t("nextModuleA1Cta") }}
		>
			<Box mt={2}>
				<Typography color="text.secondary">
					{t("scanCycleManualLinkPrefix")}{" "}
					<PublicLink href="/user-manual">
						{t("scanCycleManualLinkLabel")}
					</PublicLink>
					.
				</Typography>
			</Box>
		</TrainingModulePage>
	);
}
