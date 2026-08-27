"use client";

import Section from "@/schemas/ladder/section.schema";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { Edge, Node } from "@xyflow/react";
import React, { useCallback } from "react";
import useFlowContextMenu from "@/ui/lib/hooks/useFlowContextMenu";
import { useLadderContext } from "../context/LadderContext";

/**
 * Gestionnaire d'ouverture du menu contextuel — émet les événements show/hide
 * via le bus mitt de LadderContext, calqué sur useContextMenuOpeningHandlers du grafcet.
 */
export default function useLadderContextMenu(
	section: Section,
	mode: ProjectMode,
) {
	const { contextMenuEvents } = useLadderContext();
	const { openContextMenu, closeContextMenu } = useFlowContextMenu<any>(
		contextMenuEvents,
		useCallback(
			(element: any) => {
				if (element.type === "pane") return true;
				if (mode !== ProjectMode.DESIGN) return false;
				if (
					element.id &&
					"position" in element &&
					!section.getElement(element.id)
				)
					return false; // is Node
				return true;
			},
			[mode, section],
		),
	);

	const openNodeContextMenu = useCallback(
		(event: React.MouseEvent | MouseEvent, node: Node) => {
			openContextMenu(event, node);
		},
		[openContextMenu],
	);

	const openEdgeContextMenu = useCallback(
		(event: React.MouseEvent | MouseEvent, edge: Edge) => {
			openContextMenu(event, edge);
		},
		[openContextMenu],
	);

	const openPaneContextMenu = useCallback(
		(event: React.MouseEvent | MouseEvent) => {
			openContextMenu(event, { type: "pane" });
		},
		[openContextMenu],
	);

	return {
		openNodeContextMenu,
		openEdgeContextMenu,
		openPaneContextMenu,
		closeContextMenu,
	};
}
