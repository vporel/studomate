"use client";

import { useProjectStore } from "@/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/lib/context-menu/context-menu";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { explorerContextMenuEventsOut } from "./ExplorerContextMenu";

export default function useGrafcetMenuItems(): (grafcetId: string) => ContextMenuItemType[][] {
	const { deleteGrafcet, openPage } = useProjectStore(
		useShallow((state) => ({ deleteGrafcet: state.deleteGrafcet, openPage: state.openPage })),
	);

	return useCallback(
		(grafcetId: string) => {
			return [
				[
					{
						label: "Ouvrir",
						onClick: () => {
							const grafcet = project?.grafcets[grafcetId];
							if (grafcet) {
								openPage({
									id: grafcetId,
									type: "grafcet",
									title: grafcet.name,
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
		[openPage, deleteGrafcet],
	);
}
