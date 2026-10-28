import type { StepData } from "../ModuleStepper";
import type { TrainingTranslator } from "../training-translator";
import A4_STEP_IDS from "@/training/step-ids/a4";

export default function buildA4Steps(t: TrainingTranslator): StepData[] {
	return [
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
			embeddedTemplateId: "linear-sequence-naive-ladder",
			embeddedWatchOpen: true,
			embeddedInitialView: { type: "ladder" },
			cta: {
				templateId: "linear-sequence-naive-ladder",
				exerciseLabel: t("observeSimulationCta"),
				primaryMode: "solution",
				autostartSimulation: true,
			},
		},
		{
			id: A4_STEP_IDS.theoryMethodLadder,
			kind: "theory",
			title: t("a4TheoryMethodLadderTitle"),
			body: t.raw("a4TheoryMethodLadderBody") as string[],
		},
		{
			id: A4_STEP_IDS.theoryTwoPrograms,
			kind: "theory",
			title: t("a4TheoryTwoProgramsTitle"),
			body: t.raw("a4TheoryTwoProgramsBody") as string[],
		},
		{
			id: A4_STEP_IDS.exerciseGrafcetLinear,
			kind: "exercise",
			title: t("a4ExerciseGrafcetLinearTitle"),
			body: t.raw("a4ExerciseGrafcetLinearBody") as string[],
			cta: {
				templateId: "linear-sequence-ladder",
				exerciseLabel: t("openEditorCta"),
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
			id: A4_STEP_IDS.theoryEdgeActionsLadder,
			kind: "theory",
			title: t("a4TheoryEdgeActionsLadderTitle"),
			body: t.raw("a4TheoryEdgeActionsLadderBody") as string[],
		},
		{
			id: A4_STEP_IDS.theoryReceptivityTimer,
			kind: "theory",
			title: t("a4TheoryReceptivityTimerTitle"),
			body: t.raw("a4TheoryReceptivityTimerBody") as string[],
		},
		{
			id: A4_STEP_IDS.theoryMovementSupervision,
			kind: "theory",
			title: t("a4TheoryMovementSupervisionTitle"),
			body: t.raw("a4TheoryMovementSupervisionBody") as string[],
		},
		{
			id: A4_STEP_IDS.synthesisDrilling,
			kind: "synthesis",
			title: t("a4SynthesisDrillingTitle"),
			body: t.raw("a4SynthesisDrillingBody") as string[],
			cta: {
				templateId: "drilling-ladder",
				exerciseLabel: t("openEditorCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A4_STEP_IDS.conclusion,
			kind: "theory",
			title: t("a4ConclusionTitle"),
			body: t.raw("a4ConclusionBody") as string[],
		},
	];
}
