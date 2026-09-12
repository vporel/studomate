"use client";

import Grafcet from "@/schemas/grafcet/grafcet.schema";
import TransitionHelper from "@/schemas/grafcet/helpers/transition.helper";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import GrafcetWorkflowManager from "@/ui/stores/grafcet/managers/workflow.manager";
import { TransitionNodeType } from "../nodes/TransitionNode";
import { MenuTranslate } from "./menu-translate";

export default function transitionContextMenuItems(
	transition: TransitionNodeType,
	grafcet: Grafcet,
	workflowManager: GrafcetWorkflowManager,
	t: MenuTranslate,
): ContextMenuItemType[][] {
	return [
		[
			{
				label: t("addStep"),
				disabled: TransitionHelper.hasSuccessor(transition.id, grafcet),
				onClick: () => workflowManager.addStepAfterTransition(transition.id),
			},
		],
	];
}
