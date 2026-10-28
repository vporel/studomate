"use client";

import Section from "@/schemas/ladder/section.schema";
import { Edge, Node } from "@xyflow/react";
import React, { useCallback } from "react";
import useFlowContextMenu from "@/ui/lib/react-flow/useFlowContextMenu";
import { useLadderContext } from "../context/LadderContext";

/**
 * Gestionnaire d'ouverture du menu contextuel — émet les événements show/hide
 * via le bus mitt de LadderContext, calqué sur useContextMenuOpeningHandlers du grafcet.
 */
export default function useLadderContextMenu(
	section: Section,
	canEdit: boolean,
) {
	const { contextMenuEvents } = useLadderContext();
	const { openContextMenu, closeContextMenu } = useFlowContextMenu<any>(
		contextMenuEvents,
		useCallback(
			(element: any) => {
				if (element.type === "pane") return true;
				if (!canEdit) return false;
				if (
					element.id &&
					"position" in element &&
					!section.getElement(element.id)
				)
					return false; // is Node
				return true;
			},
			[canEdit, section],
		),
	);

	const openNodeContextMenu = useCallback(
		(event: React.MouseEvent | MouseEvent, node: Node) => {
			openContextMenu(event, node, { sectionId: section.id });
		},
		[openContextMenu, section.id],
	);

	const openEdgeContextMenu = useCallback(
		(event: React.MouseEvent | MouseEvent, edge: Edge) => {
			openContextMenu(event, edge, { sectionId: section.id });
		},
		[openContextMenu, section.id],
	);

	const openPaneContextMenu = useCallback(
		(event: React.MouseEvent | MouseEvent) => {
			openContextMenu(event, { type: "pane" }, { sectionId: section.id });
		},
		[openContextMenu, section.id],
	);

	return {
		openNodeContextMenu,
		openEdgeContextMenu,
		openPaneContextMenu,
		closeContextMenu,
	};
}
