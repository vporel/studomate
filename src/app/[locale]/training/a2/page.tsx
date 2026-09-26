import { toLocale } from "@/i18n/config";
import { createGenerateMetadata } from "@/app/metadata";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StepData } from "../ModuleStepper";
import TrainingModulePage from "../TrainingModulePage";
import A2_STEP_IDS from "./step-ids";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = createGenerateMetadata(
	"/training/a2",
	"trainingA2Title",
	"trainingA2Description",
);

export default async function TrainingA2({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "training" });

	const steps: StepData[] = [
		{
			id: A2_STEP_IDS.ladderBasics,
			kind: "theory",
			title: t("a2LadderBasicsTitle"),
			body: t.raw("a2LadderBasicsBody") as string[],
		},
		{
			id: A2_STEP_IDS.theoryContactsCoils,
			kind: "theory",
			title: t("a2TheoryContactsCoilsTitle"),
			body: t.raw("a2TheoryContactsCoilsBody") as string[],
		},
		{
			id: A2_STEP_IDS.exerciseReading,
			kind: "exercise",
			title: t("a2ExerciseReadingTitle"),
			body: t.raw("a2ExerciseReadingBody") as string[],
			cta: {
				templateId: "ladder-reading",
				exerciseLabel: t("openExerciseCta"),
			},
		},
		{
			id: A2_STEP_IDS.exerciseLogic,
			kind: "exercise",
			title: t("a2ExerciseLogicTitle"),
			body: t.raw("a2ExerciseLogicBody") as string[],
			cta: {
				templateId: "ladder-logic",
				exerciseLabel: t("openExerciseCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A2_STEP_IDS.theorySelfHolding,
			kind: "theory",
			title: t("a2TheorySelfHoldingTitle"),
			body: t.raw("a2TheorySelfHoldingBody") as string[],
		},
		{
			id: A2_STEP_IDS.exerciseSelfHolding,
			kind: "exercise",
			title: t("a2ExerciseSelfHoldingTitle"),
			body: t.raw("a2ExerciseSelfHoldingBody") as string[],
			cta: {
				templateId: "ladder-self-holding",
				exerciseLabel: t("openExerciseCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A2_STEP_IDS.exerciseInterlock,
			kind: "exercise",
			title: t("a2ExerciseInterlockTitle"),
			body: t.raw("a2ExerciseInterlockBody") as string[],
			cta: {
				templateId: "ladder-interlock",
				exerciseLabel: t("openExerciseCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A2_STEP_IDS.theorySetReset,
			kind: "theory",
			title: t("a2TheorySetResetTitle"),
			body: t.raw("a2TheorySetResetBody") as string[],
		},
		{
			id: A2_STEP_IDS.exerciseMemory,
			kind: "exercise",
			title: t("a2ExerciseMemoryTitle"),
			body: t.raw("a2ExerciseMemoryBody") as string[],
			cta: {
				templateId: "ladder-memory",
				exerciseLabel: t("openExerciseCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A2_STEP_IDS.theoryEdges,
			kind: "theory",
			title: t("a2TheoryEdgesTitle"),
			body: t.raw("a2TheoryEdgesBody") as string[],
		},
		{
			id: A2_STEP_IDS.exerciseEdgesReading,
			kind: "exercise",
			title: t("a2ExerciseEdgesReadingTitle"),
			body: t.raw("a2ExerciseEdgesReadingBody") as string[],
			cta: {
				templateId: "ladder-edges-reading",
				exerciseLabel: t("openExerciseCta"),
			},
		},
		{
			id: A2_STEP_IDS.exerciseToggle,
			kind: "exercise",
			title: t("a2ExerciseToggleTitle"),
			body: t.raw("a2ExerciseToggleBody") as string[],
			cta: {
				templateId: "ladder-toggle",
				exerciseLabel: t("openExerciseCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A2_STEP_IDS.synthesisGate,
			kind: "synthesis",
			title: t("a2SynthesisGateTitle"),
			body: t.raw("a2SynthesisGateBody") as string[],
			cta: {
				templateId: "ladder-gate",
				exerciseLabel: t("ctaExercise"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A2_STEP_IDS.conclusion,
			kind: "theory",
			title: t("a2ConclusionTitle"),
			body: t.raw("a2ConclusionBody") as string[],
		},
	];

	return (
		<TrainingModulePage
			title={t("a2PageTitle")}
			intro={t("a2Intro")}
			steps={steps}
			moduleId="a2"
			prevLabel={t("previousStep")}
			nextLabel={t("nextStep")}
			nextModule={{ href: "/training/a3", label: t("nextModuleA3Cta") }}
		/>
	);
}
