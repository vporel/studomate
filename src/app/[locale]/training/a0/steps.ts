import type { StepData } from "../ModuleStepper";
import type { TrainingTranslator } from "../training-translator";
import A0_STEP_IDS from "./step-ids";

export default function buildA0Steps(t: TrainingTranslator): StepData[] {
	return [
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
}
