"use client";

import { useProjectStore } from "@/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/lib/context-menu/context-menu";
import { useCallback } from "react";
import { explorerContextMenuEventsOut } from "./ExplorerContextMenu";

export default function useGrafcetMenuItems(): (grafcetId: string) => ContextMenuItemType[][] {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const pagesManager = useProjectStore((state) => state.pagesManager);

	return useCallback(
		(grafcetId: string) => {
			return [
				[
					{
						label: "Ouvrir",
						onClick: () => {
							const grafcet = grafcetsManager.getGrafcet(grafcetId);
							if (grafcet) {
								pagesManager.openPage({
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
						onClick: () => {
							if (confirm("Êtes-vous sûr de vouloir supprimer ce grafcet ?")) {
								grafcetsManager.deleteGrafcet(grafcetId);
							}
						},
					},
				],
			];
		},
		[grafcetsManager, pagesManager],
	);
}
