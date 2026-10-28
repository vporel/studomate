import type { StepData } from "../ModuleStepper";
import type { TrainingTranslator } from "../training-translator";
import A0_STEP_IDS from "@/training/step-ids/a0";

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
			embeddedTemplateId: "traffic-light",
			cta: {
				templateId: "traffic-light",
				exerciseLabel: t("scanCycleCta"),
				primaryMode: "solution",
				autostartSimulation: true,
			},
		},
		{
			id: A0_STEP_IDS.conclusion,
			kind: "theory",
			title: t("a0ConclusionTitle"),
			body: t.raw("a0ConclusionBody") as string[],
		},
	];
}
