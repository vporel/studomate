import type { StepData } from "../ModuleStepper";
import type { TrainingTranslator } from "../training-translator";
import A3_STEP_IDS from "./step-ids";

export default function buildA3Steps(t: TrainingTranslator): StepData[] {
	return [
		{
			id: A3_STEP_IDS.theoryTimers,
			kind: "theory",
			title: t("a3TheoryTimersTitle"),
			body: t.raw("a3TheoryTimersBody") as string[],
		},
		{
			id: A3_STEP_IDS.exerciseTimersReading,
			kind: "exercise",
			title: t("a3ExerciseTimersReadingTitle"),
			body: t.raw("a3ExerciseTimersReadingBody") as string[],
			cta: {
				templateId: "ladder-timers-reading",
				exerciseLabel: t("openExerciseCta"),
			},
		},
		{
			id: A3_STEP_IDS.exerciseTimers,
			kind: "exercise",
			title: t("a3ExerciseTimersTitle"),
			body: t.raw("a3ExerciseTimersBody") as string[],
			cta: {
				templateId: "ladder-timers",
				exerciseLabel: t("openExerciseCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A3_STEP_IDS.theoryCounters,
			kind: "theory",
			title: t("a3TheoryCountersTitle"),
			body: t.raw("a3TheoryCountersBody") as string[],
		},
		{
			id: A3_STEP_IDS.exerciseCounters,
			kind: "exercise",
			title: t("a3ExerciseCountersTitle"),
			body: t.raw("a3ExerciseCountersBody") as string[],
			cta: {
				templateId: "ladder-counters",
				exerciseLabel: t("openExerciseCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A3_STEP_IDS.theoryNumeric,
			kind: "theory",
			title: t("a3TheoryNumericTitle"),
			body: t.raw("a3TheoryNumericBody") as string[],
		},
		{
			id: A3_STEP_IDS.exerciseTank,
			kind: "exercise",
			title: t("a3ExerciseTankTitle"),
			body: t.raw("a3ExerciseTankBody") as string[],
			cta: {
				templateId: "ladder-tank",
				exerciseLabel: t("openExerciseCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A3_STEP_IDS.theoryTypes,
			kind: "theory",
			title: t("a3TheoryTypesTitle"),
			body: t.raw("a3TheoryTypesBody") as string[],
		},
		{
			id: A3_STEP_IDS.exerciseScaling,
			kind: "exercise",
			title: t("a3ExerciseScalingTitle"),
			body: t.raw("a3ExerciseScalingBody") as string[],
			cta: {
				templateId: "ladder-scaling",
				exerciseLabel: t("openExerciseCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A3_STEP_IDS.theoryStructure,
			kind: "theory",
			title: t("a3TheoryStructureTitle"),
			body: t.raw("a3TheoryStructureBody") as string[],
		},
		{
			id: A3_STEP_IDS.exerciseSubprograms,
			kind: "exercise",
			title: t("a3ExerciseSubprogramsTitle"),
			body: t.raw("a3ExerciseSubprogramsBody") as string[],
			cta: {
				templateId: "ladder-subprograms",
				exerciseLabel: t("openExerciseCta"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A3_STEP_IDS.synthesisPacking,
			kind: "synthesis",
			title: t("a3SynthesisPackingTitle"),
			body: t.raw("a3SynthesisPackingBody") as string[],
			cta: {
				templateId: "ladder-packing",
				exerciseLabel: t("ctaExercise"),
				solutionLabel: t("ctaSolution"),
			},
		},
		{
			id: A3_STEP_IDS.conclusion,
			kind: "theory",
			title: t("a3ConclusionTitle"),
			body: t.raw("a3ConclusionBody") as string[],
		},
	];
}
