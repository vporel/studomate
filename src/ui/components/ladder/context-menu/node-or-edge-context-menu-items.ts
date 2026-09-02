"use client";

import {
	COIL_TYPES,
	CONTACT_TYPES,
	CoilType,
	ContactType,
} from "@/schemas/ladder/element.schema";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { platformShortcut } from "@/ui/lib/platform";
import LadderCopyCutPasteManager from "@/ui/stores/ladder/managers/copy-cut-paste.manager";
import LadderWorkflowManager from "@/ui/stores/ladder/managers/workflow.manager";
import { LADDER_CONNECTION_EDGE_TYPE } from "@/ui/utils/ladder/ladder-flow-builder";
import { Edge, Node, OnDelete } from "@xyflow/react";
import { LadderContextMenuElement } from "./ladder-context-menu";
import { MenuTranslate } from "./menu-translate";

const CONTACT_TYPE_KEYS: Record<ContactType, string> = {
	NO: "contactNO",
	NF: "contactNF",
	P: "contactP",
	N: "contactN",
};

const COIL_TYPE_KEYS: Record<CoilType, string> = {
	normal: "coilNormal",
	set: "coilSet",
	reset: "coilReset",
};

export default function nodeOrEdgeContextMenuItems(
	element: LadderContextMenuElement,
	sectionId: string,
	handleDelete: OnDelete,
	copyCutPasteManager: LadderCopyCutPasteManager,
	workflowManager: LadderWorkflowManager,
	t: MenuTranslate,
): ContextMenuItemType[][] {
	const groups: ContextMenuItemType[][] = [];

	if (element.type === "contact") {
		const current = element.data.type;
		groups.push([
			{
				label: t("type"),
				subItems: CONTACT_TYPES.map((type) => ({
					label: t(CONTACT_TYPE_KEYS[type]),
					checked: type === current,
					onClick: () =>
						workflowManager.setContactType(sectionId, element.id, type),
				})),
			},
		]);
	}

	if (element.type === "coil") {
		const current = element.data.type;
		groups.push([
			{
				label: t("type"),
				subItems: COIL_TYPES.map((type) => ({
					label: t(COIL_TYPE_KEYS[type]),
					checked: type === current,
					onClick: () =>
						workflowManager.setCoilType(sectionId, element.id, type),
				})),
			},
		]);
	}

	groups.push([
		{
			label: t("copy"),
			shortcut: platformShortcut("Ctrl+C", "Cmd+C"),
			onClick: () => copyCutPasteManager.copySelectedElements(),
		},
		{
			label: t("cut"),
			shortcut: platformShortcut("Ctrl+X", "Cmd+X"),
			onClick: () => copyCutPasteManager.cutSelectedElements(),
		},
	]);

	groups.push([
		{
			label: t("delete"),
			onClick: () => {
				if (element.type === LADDER_CONNECTION_EDGE_TYPE) {
					handleDelete({
						nodes: [],
						edges: [{ id: (element as Edge).id } as Edge],
					});
				} else if (element.type !== "pane") {
					handleDelete({
						nodes: [{ id: (element as Node).id } as Node],
						edges: [],
					});
				}
			},
		},
	]);

	return groups;
}
