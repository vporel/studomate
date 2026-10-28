import type { StepData } from "../ModuleStepper";
import type { TrainingTranslator } from "../training-translator";
import A5_STEP_IDS from "@/training/step-ids/a5";

export default function buildA5Steps(t: TrainingTranslator): StepData[] {
	return [
		{
			id: A5_STEP_IDS.theoryOrDivergenceLadder,
			kind: "theory",
			title: t("a5TheoryOrDivergenceLadderTitle"),
			body: t.raw("a5TheoryOrDivergenceLadderBody") as string[],
		},
		{
			id: A5_STEP_IDS.exerciseGrafcetOrDivergence,
			kind: "exercise",
			title: t("a5ExerciseGrafcetOrDivergenceTitle"),
			body: t.raw("a5ExerciseGrafcetOrDivergenceBody") as string[],
			cta: {
				templateId: "or-divergence-ladder",
				exerciseLabel: t("openEditorCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A5_STEP_IDS.theoryAndDivergenceLadder,
			kind: "theory",
			title: t("a5TheoryAndDivergenceLadderTitle"),
			body: t.raw("a5TheoryAndDivergenceLadderBody") as string[],
		},
		{
			id: A5_STEP_IDS.exerciseGrafcetAndDivergence,
			kind: "exercise",
			title: t("a5ExerciseGrafcetAndDivergenceTitle"),
			body: t.raw("a5ExerciseGrafcetAndDivergenceBody") as string[],
			cta: {
				templateId: "and-divergence-ladder",
				exerciseLabel: t("openEditorCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A5_STEP_IDS.theoryGrafcetReset,
			kind: "theory",
			title: t("a5TheoryGrafcetResetTitle"),
			body: t.raw("a5TheoryGrafcetResetBody") as string[],
		},
		{
			id: A5_STEP_IDS.exerciseGrafcetReset,
			kind: "exercise",
			title: t("a5ExerciseGrafcetResetTitle"),
			body: t.raw("a5ExerciseGrafcetResetBody") as string[],
			cta: {
				templateId: "traffic-light-ladder",
				exerciseLabel: t("openEditorCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A5_STEP_IDS.synthesisParking,
			kind: "synthesis",
			title: t("a5SynthesisParkingTitle"),
			body: t.raw("a5SynthesisParkingBody") as string[],
			cta: {
				templateId: "parking-ladder",
				exerciseLabel: t("openEditorCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A5_STEP_IDS.theoryGoingFurther,
			kind: "theory",
			title: t("a5TheoryGoingFurtherTitle"),
			body: t.raw("a5TheoryGoingFurtherBody") as string[],
			embeddedTemplateId: "gate-per-transition-ladder",
			embeddedWatchOpen: true,
			embeddedInitialView: { type: "ladder" },
			cta: {
				templateId: "gate-per-transition-ladder",
				exerciseLabel: t("a5GoingFurtherObservePerTransitionCta"),
				primaryMode: "solution",
				autostartSimulation: true,
			},
		},
		{
			id: A5_STEP_IDS.theoryThreeBlocks,
			kind: "theory",
			title: t("a5TheoryThreeBlocksTitle"),
			body: t.raw("a5TheoryThreeBlocksBody") as string[],
			embeddedTemplateId: "gate-grafcet-ladder",
			embeddedWatchOpen: true,
			embeddedInitialView: { type: "ladder" },
			cta: {
				templateId: "gate-grafcet-ladder",
				exerciseLabel: t("a5GoingFurtherObserveThreeBlocksCta"),
				primaryMode: "solution",
				autostartSimulation: true,
			},
		},
		{
			id: A5_STEP_IDS.conclusion,
			kind: "theory",
			title: t("a5ConclusionTitle"),
			body: t.raw("a5ConclusionBody") as string[],
		},
	];
}
