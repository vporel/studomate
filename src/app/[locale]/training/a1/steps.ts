import type { StepData } from "../ModuleStepper";
import type { TrainingTranslator } from "../training-translator";
import A1_STEP_IDS from "./step-ids";

export default function buildA1Steps(t: TrainingTranslator): StepData[] {
	return [
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
			id: A1_STEP_IDS.observeLinear,
			kind: "exercise",
			title: t("observeLinearTitle"),
			body: t.raw("observeLinearBody") as string[],
			cta: {
				templateId: "linear-sequence",
				exerciseLabel: t("observeSimulationCta"),
				primaryMode: "solution",
				autostartSimulation: true,
			},
		},
		{
			id: A1_STEP_IDS.theoryActions,
			kind: "theory",
			title: t("theoryActionsTitle"),
			body: t.raw("theoryActionsBody") as string[],
		},
		{
			id: A1_STEP_IDS.observeActions,
			kind: "exercise",
			title: t("observeActionsTitle"),
			body: t.raw("observeActionsBody") as string[],
			cta: {
				templateId: "parking",
				exerciseLabel: t("observeSimulationCta"),
				primaryMode: "solution",
				autostartSimulation: true,
			},
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
			id: A1_STEP_IDS.observeTimer,
			kind: "exercise",
			title: t("observeTimerTitle"),
			body: t.raw("observeTimerBody") as string[],
			cta: {
				templateId: "traffic-light",
				exerciseLabel: t("observeSimulationCta"),
				primaryMode: "solution",
				autostartSimulation: true,
			},
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
			id: A1_STEP_IDS.theoryAndDivergence,
			kind: "theory",
			title: t("theoryAndDivergenceTitle"),
			body: t.raw("theoryAndDivergenceBody") as string[],
		},
		{
			id: A1_STEP_IDS.exerciseAndDivergence,
			kind: "exercise",
			title: t("exerciseAndDivergenceTitle"),
			body: t.raw("exerciseAndDivergenceBody") as string[],
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
}
