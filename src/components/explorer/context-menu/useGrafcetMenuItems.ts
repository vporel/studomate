"use client";

import { usePagesContext } from "@/components/pages/context/PagesContext";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/lib/context-menu/context-menu";
import { useCallback } from "react";
import { explorerContextMenuEventsOut } from "./ExplorerContextMenu";

export default function useGrafcetMenuItems(): (grafcetId: string) => ContextMenuItemType[][] {
	const { project, deleteGrafcet } = useProjectContext();
	const { openPage } = usePagesContext();

	return useCallback(
		(grafcetId: string) => {
			return [
				[
					{
						label: "Ouvrir",
						onClick: () => {
							const grafcet = project?.grafcets[grafcetId];
							if (grafcet) {
								openPage(grafcetId, {
									type: "grafcet",
									title: grafcet.name,
									grafcet,
								});
							}
						},
					},
				],
				[
					{
						label: "Renommer",
						onClick: () => explorerContextMenuEventsOut.emit("grafcet-rename", { grafcetId }),
						shortcut: "F2",
					},
					{
						label: "Supprimer",
						onClick: () => deleteGrafcet(grafcetId),
					},
				],
			];
		},
		[project?.grafcets, openPage, deleteGrafcet]
	);
}
