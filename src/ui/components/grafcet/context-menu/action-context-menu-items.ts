"use client";

import {
	ACTION_EXECUTION_MODE_LABELS,
	ACTION_TYPES_LABELS,
	ACTION_TYPES_TO_EXECUTION_MODES,
} from "@/schemas/grafcet/action.schema";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import WorkflowManager from "@/ui/stores/grafcet/managers/workflow.manager";
import { ActionNodeType } from "../nodes/ActionNode";

export default function actionContextMenuItems(
	action: ActionNodeType,
	workflowManager: WorkflowManager,
): ContextMenuItemType[][] {
	const items: ContextMenuItemType[][] = [];
	const part1: ContextMenuItemType[] = [
		{
			label: "Type",
			subItems: Object.entries(ACTION_TYPES_LABELS).map(([type, label]) => ({
				label: label,
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
			label: "Mode d'exécution",
			subItems: Object.entries(ACTION_EXECUTION_MODE_LABELS)
				.filter(([mode]) => validExecutionModes.includes(mode as any))
				.map(([mode, label]) => ({
					label: label,
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
