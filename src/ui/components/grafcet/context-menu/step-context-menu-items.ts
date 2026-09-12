"use client";

import Grafcet from "@/schemas/grafcet/grafcet.schema";
import StepHelper from "@/schemas/grafcet/helpers/step.helper";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import SimulationManager from "@/ui/stores/project/managers/simulation/simulation.manager";
import GrafcetWorkflowManager from "@/ui/stores/grafcet/managers/workflow.manager";
import { StepNodeType } from "../nodes/StepNode";
import { MenuTranslate } from "./menu-translate";

export default function stepContextMenuItems(
	step: StepNodeType,
	t: MenuTranslate,
	{
		inSimulation,
		grafcet,
		workflowManager,
		stepVariableId,
		simulationManager,
		forcedVariables,
	}: {
		inSimulation: boolean;
		grafcet: Grafcet;
		workflowManager: GrafcetWorkflowManager;
		stepVariableId: string;
		simulationManager: SimulationManager;
		forcedVariables: Record<string, unknown>;
	},
): ContextMenuItemType[][] {
	if (!inSimulation) {
		return [
			[
				{
					label: t("addAction"),
					onClick: () => workflowManager.addActionToStep(step.id),
				},
				{
					label: t("addTransition"),
					disabled: StepHelper.hasSuccessor(step.id, grafcet),
					onClick: () => workflowManager.addTransitionAfterStep(step.id),
				},
			],
		];
	}

	const isForcedActive = forcedVariables[stepVariableId] === true;
	const isForcedInactive = forcedVariables[stepVariableId] === false;
	const isForced = stepVariableId in forcedVariables;

	return [
		[
			{
				label: t("forceActive"),
				checked: isForcedActive,
				onClick: () => simulationManager.forceVariable(stepVariableId, true),
			},
			{
				label: t("forceInactive"),
				checked: isForcedInactive,
				onClick: () => simulationManager.forceVariable(stepVariableId, false),
			},
			{
				label: t("releaseForce"),
				disabled: !isForced,
				onClick: () => simulationManager.releaseVariable(stepVariableId),
			},
		],
	];
}
