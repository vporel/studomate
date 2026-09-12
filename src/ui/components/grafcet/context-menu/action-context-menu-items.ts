"use client";

import {
	ActionExecutionMode,
	ActionType,
	ACTION_TYPES_TO_EXECUTION_MODES,
} from "@/schemas/grafcet/action.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ActionHelper from "@/schemas/grafcet/helpers/action.helper";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import GrafcetWorkflowManager from "@/ui/stores/grafcet/managers/workflow.manager";
import { ActionNodeType } from "../nodes/ActionNode";
import { MenuTranslate } from "./menu-translate";

export default function actionContextMenuItems(
	action: ActionNodeType,
	grafcet: Grafcet,
	inSimulation: boolean,
	workflowManager: GrafcetWorkflowManager,
	t: MenuTranslate,
	tType: MenuTranslate,
	tMode: MenuTranslate,
): ContextMenuItemType[][] {
	const items: ContextMenuItemType[][] = [];

	if (!inSimulation) {
		const step = ActionHelper.getStep(action.id, grafcet);
		if (step) {
			items.push([
				{
					label: t("addAction"),
					onClick: () => workflowManager.addActionToStep(step.id),
				},
			]);
		}
	}
	const part1: ContextMenuItemType[] = [
		{
			label: t("actionType"),
			subItems: Object.values(ActionType).map((type) => ({
				label: tType(type),
				checked: action.data.type === type,
				onClick: () =>
					workflowManager.updateNodeData(action.id, {
						type: type as any,
					}),
			})),
		},
	];
	const validExecutionModes = ACTION_TYPES_TO_EXECUTION_MODES[action.data.type];
	if (validExecutionModes.length > 0) {
		part1.push({
			label: t("actionMode"),
			subItems: Object.values(ActionExecutionMode)
				.filter((mode) => validExecutionModes.includes(mode))
				.map((mode) => ({
					label: tMode(mode),
					checked: action.data.executionMode === mode,
					onClick: () =>
						workflowManager.updateNodeData(action.id, {
							executionMode: mode as any,
						}),
				})),
		});
	}
	items.push(part1);
	return items;
}
