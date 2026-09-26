import { toLocale } from "@/i18n/config";
import { createGenerateMetadata } from "@/app/metadata";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StepData } from "../ModuleStepper";
import TrainingModulePage from "../TrainingModulePage";
import A1_STEP_IDS from "./step-ids";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = createGenerateMetadata(
	"/training/a1",
	"trainingA1Title",
	"trainingA1Description",
);

export default async function TrainingA1({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "training" });

	const steps: StepData[] = [
		{
			id: A1_STEP_IDS.grafcetDefinition,
			kind: "theory",
			title: t("grafcetDefinitionTitle"),
			body: t.raw("grafcetDefinitionBody") as string[],
		},
		{
			id: A1_STEP_IDS.theory,
			kind: "theory",
			title: t("theoryTitle"),
			body: t.raw("theoryBody") as string[],
		},
		{
			id: A1_STEP_IDS.theoryActions,
			kind: "theory",
			title: t("theoryActionsTitle"),
			body: t.raw("theoryActionsBody") as string[],
		},
		{
			id: A1_STEP_IDS.exerciseLinear,
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
			id: A1_STEP_IDS.theoryTimer,
			kind: "theory",
			title: t("theoryTimerTitle"),
			body: t.raw("theoryTimerBody") as string[],
		},
		{
			id: A1_STEP_IDS.synthesisTrafficLight,
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
			id: A1_STEP_IDS.theoryOrDivergence,
			kind: "theory",
			title: t("theoryOrDivergenceTitle"),
			body: t.raw("theoryOrDivergenceBody") as string[],
		},
		{
			id: A1_STEP_IDS.exerciseOrDivergence,
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
			id: A1_STEP_IDS.exerciseAndDivergence,
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
			id: A1_STEP_IDS.synthesisParking,
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
			id: A1_STEP_IDS.synthesisCrossroads,
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
			id: A1_STEP_IDS.readingErrors,
			kind: "theory",
			title: t("readingErrorsTitle"),
			body: t.raw("readingErrorsBody") as string[],
		},
	];

	return (
		<TrainingModulePage
			title={t("a1PageTitle")}
			intro={t("a1Intro")}
			steps={steps}
			moduleId="a1"
			prevLabel={t("previousStep")}
			nextLabel={t("nextStep")}
			nextModule={{ href: "/training/a2", label: t("nextModuleA2Cta") }}
		/>
	);
}
