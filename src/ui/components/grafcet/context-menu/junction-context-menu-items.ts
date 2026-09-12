"use client";

import GrafcetWorkflowManager from "@/ui/stores/grafcet/managers/workflow.manager";
import { Emitter } from "mitt";
import { GrafcetContextMenuEvents } from "../context/context-menu-events";
import { JunctionNodeType } from "../flow/grafcet-nodes-definitions";
import { MenuTranslate } from "./menu-translate";

export default function junctionContextMenuItems(
	junction: JunctionNodeType,
	contextMenuEvents: Emitter<GrafcetContextMenuEvents>,
	workflowManager: GrafcetWorkflowManager,
	t: MenuTranslate,
): {
	label: string;
	onClick?: () => void;
	disabled?: boolean;
	subItems?: {
		label: string;
		onClick: () => void;
	}[];
}[][] {
	return [
		[
			{
				label: t("selectPivot"),
				onClick: () =>
					contextMenuEvents.emit("node-action", {
						nodeId: junction.id,
						type: "junction-select-pivot",
					}),
			},
			{
				label: t("selectBranch"),
				subItems: junction.data.branchesOrder.map((branchId, index) => ({
					label: t("branch", { n: index + 1 }),
					onClick: () =>
						contextMenuEvents.emit("node-action", {
							nodeId: junction.id,
							type: "junction-select-branch",
							branchId: branchId,
						}),
				})),
			},
			{
				label: t("deleteBranch"),
				disabled: junction.data.branchesOrder.length <= 2,
				subItems: junction.data.branchesOrder.map((branchId, index) => ({
					label: t("branch", { n: index + 1 }),
					onClick: () =>
						workflowManager.deleteJunctionBranch(junction.id, branchId),
				})),
			},
		],
	];
}
