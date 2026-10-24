import type { StepData } from "../ModuleStepper";
import type { TrainingTranslator } from "../training-translator";
import A2_STEP_IDS from "./step-ids";

export default function buildA2Steps(t: TrainingTranslator): StepData[] {
	return [
		{
			id: A2_STEP_IDS.ladderBasics,
			kind: "theory",
			title: t("a2LadderBasicsTitle"),
			body: t.raw("a2LadderBasicsBody") as string[],
			cta: {
				templateId: "ladder-and-or",
				exerciseLabel: t("openExerciseCta"),
			},
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
}
