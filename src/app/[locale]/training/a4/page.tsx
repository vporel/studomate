import { toLocale } from "@/i18n/config";
import { createGenerateMetadata } from "@/app/metadata";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StepData } from "../ModuleStepper";
import TrainingModulePage from "../TrainingModulePage";
import A4_STEP_IDS from "./step-ids";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = createGenerateMetadata(
	"/training/a4",
	"trainingA4Title",
	"trainingA4Description",
);

export default async function TrainingA4({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "training" });

	const steps: StepData[] = [
		{
			id: A4_STEP_IDS.theoryStepsLadder,
			kind: "theory",
			title: t("a4TheoryStepsLadderTitle"),
			body: t.raw("a4TheoryStepsLadderBody") as string[],
		},
		{
			id: A4_STEP_IDS.exerciseGrafcetNaive,
			kind: "exercise",
			title: t("a4ExerciseGrafcetNaiveTitle"),
			body: t.raw("a4ExerciseGrafcetNaiveBody") as string[],
			cta: {
				templateId: "linear-sequence-naive-ladder",
				exerciseLabel: t("openExerciseCta"),
			},
		},
		{
			id: A4_STEP_IDS.theoryMethodLadder,
			kind: "theory",
			title: t("a4TheoryMethodLadderTitle"),
			body: t.raw("a4TheoryMethodLadderBody") as string[],
		},
		{
			id: A4_STEP_IDS.exerciseGrafcetLinear,
			kind: "exercise",
			title: t("a4ExerciseGrafcetLinearTitle"),
			body: t.raw("a4ExerciseGrafcetLinearBody") as string[],
			cta: {
				templateId: "linear-sequence-ladder",
				exerciseLabel: t("openExerciseCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A4_STEP_IDS.theoryActionsLadder,
			kind: "theory",
			title: t("a4TheoryActionsLadderTitle"),
			body: t.raw("a4TheoryActionsLadderBody") as string[],
		},
		{
			id: A4_STEP_IDS.theoryTimedActionsLadder,
			kind: "theory",
			title: t("a4TheoryTimedActionsLadderTitle"),
			body: t.raw("a4TheoryTimedActionsLadderBody") as string[],
		},
		{
			id: A4_STEP_IDS.synthesisDrilling,
			kind: "synthesis",
			title: t("a4SynthesisDrillingTitle"),
			body: t.raw("a4SynthesisDrillingBody") as string[],
			cta: {
				templateId: "drilling-ladder",
				exerciseLabel: t("ctaExercise"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A4_STEP_IDS.theoryDivergencesLadder,
			kind: "theory",
			title: t("a4TheoryDivergencesLadderTitle"),
			body: t.raw("a4TheoryDivergencesLadderBody") as string[],
		},
		{
			id: A4_STEP_IDS.exerciseGrafcetOrDivergence,
			kind: "exercise",
			title: t("a4ExerciseGrafcetOrDivergenceTitle"),
			body: t.raw("a4ExerciseGrafcetOrDivergenceBody") as string[],
			cta: {
				templateId: "or-divergence-ladder",
				exerciseLabel: t("openExerciseCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A4_STEP_IDS.exerciseGrafcetAndDivergence,
			kind: "exercise",
			title: t("a4ExerciseGrafcetAndDivergenceTitle"),
			body: t.raw("a4ExerciseGrafcetAndDivergenceBody") as string[],
			cta: {
				templateId: "and-divergence-ladder",
				exerciseLabel: t("openExerciseCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A4_STEP_IDS.theoryGrafcetReset,
			kind: "theory",
			title: t("a4TheoryGrafcetResetTitle"),
			body: t.raw("a4TheoryGrafcetResetBody") as string[],
		},
		{
			id: A4_STEP_IDS.exerciseGrafcetReset,
			kind: "exercise",
			title: t("a4ExerciseGrafcetResetTitle"),
			body: t.raw("a4ExerciseGrafcetResetBody") as string[],
			cta: {
				templateId: "traffic-light-ladder",
				exerciseLabel: t("openExerciseCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A4_STEP_IDS.synthesisParking,
			kind: "synthesis",
			title: t("a4SynthesisParkingTitle"),
			body: t.raw("a4SynthesisParkingBody") as string[],
			cta: {
				templateId: "parking-ladder",
				exerciseLabel: t("ctaExercise"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A4_STEP_IDS.synthesisGateGrafcet,
			kind: "synthesis",
			title: t("a4SynthesisGateGrafcetTitle"),
			body: t.raw("a4SynthesisGateGrafcetBody") as string[],
			cta: {
				templateId: "gate-grafcet-ladder",
				exerciseLabel: t("ctaExercise"),
				solutionLabel: t("ctaSolution"),
			},
		},
	];

	return (
		<TrainingModulePage
			title={t("a4PageTitle")}
			intro={t("a4Intro")}
			steps={steps}
			moduleId="a4"
			prevLabel={t("previousStep")}
			nextLabel={t("nextStep")}
		/>
	);
}
