"use client";

import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import SimulationManager from "@/ui/stores/project/managers/simulation/simulation.manager";
import { StepNodeType } from "../nodes/StepNode";

export default function stepContextMenuItems(
	step: StepNodeType,
	stepVariableId: string,
	simulationManager: SimulationManager,
	forcedVariables: Record<string, unknown>,
): ContextMenuItemType[][] {
	const isForcedActive = forcedVariables[stepVariableId] === true;
	const isForcedInactive = forcedVariables[stepVariableId] === false;
	const isForced = stepVariableId in forcedVariables;

	return [
		[
			{
				label: "Forcer active",
				checked: isForcedActive,
				onClick: () => simulationManager.forceVariable(stepVariableId, true),
			},
			{
				label: "Forcer inactive",
				checked: isForcedInactive,
				onClick: () => simulationManager.forceVariable(stepVariableId, false),
			},
			{
				label: "Relâcher le forçage",
				disabled: !isForced,
				onClick: () => simulationManager.releaseVariable(stepVariableId),
			},
		],
	];
}
