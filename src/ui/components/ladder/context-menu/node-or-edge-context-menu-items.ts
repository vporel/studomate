"use client";

import {
	CONTACT_TYPES,
	ContactType,
} from "@/schemas/ladder/element.schema";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { platformShortcut } from "@/ui/lib/platform";
import LadderCopyCutPasteManager from "@/ui/stores/ladder/managers/copy-cut-paste.manager";
import LadderWorkflowManager from "@/ui/stores/ladder/managers/workflow.manager";
import { LADDER_CONNECTION_EDGE_TYPE } from "@/ui/utils/ladder/ladder-flow-builder";
import { Edge, Node, OnDelete } from "@xyflow/react";
import { LadderContextMenuElement } from "./ladder-context-menu";

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
	NO: "Normalement ouvert (NO)",
	NF: "Normalement fermé (NF)",
	P: "Front montant (P)",
	N: "Front descendant (N)",
};

export default function nodeOrEdgeContextMenuItems(
	element: LadderContextMenuElement,
	sectionId: string,
	handleDelete: OnDelete,
	copyCutPasteManager: LadderCopyCutPasteManager,
	workflowManager: LadderWorkflowManager,
): ContextMenuItemType[][] {
	const groups: ContextMenuItemType[][] = [
		[
			{
				label: "Copier",
				shortcut: platformShortcut("Ctrl+C", "Cmd+C"),
				onClick: () => copyCutPasteManager.copySelectedElements(),
			},
			{
				label: "Couper",
				shortcut: platformShortcut("Ctrl+X", "Cmd+X"),
				onClick: () => copyCutPasteManager.cutSelectedElements(),
			},
		],
	];

	if (element.type === "contact") {
		const current = element.data.type;
		groups.push([
			{
				label: "Type",
				subItems: CONTACT_TYPES.map((type) => ({
					label: CONTACT_TYPE_LABELS[type],
					checked: type === current,
					onClick: () =>
						workflowManager.setContactType(sectionId, element.id, type),
				})),
			},
		]);
	}

	groups.push([
		{
			label: "Supprimer",
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
