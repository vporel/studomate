"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useCallback } from "react";
import { explorerContextMenuEventsOut } from "./ExplorerContextMenu";

export default function useGrafcetMenuItems(): (grafcetId: string) => ContextMenuItemType[][] {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const designing = useProjectStore((state) => state.mode === ProjectMode.DESIGN);

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
						disabled: !designing,
						onClick: () => explorerContextMenuEventsOut.emit("grafcet-rename", { grafcetId }),
						shortcut: "F2",
					},
					{
						label: "Supprimer",
						disabled: !designing,
						onClick: () => {
							if (confirm("Êtes-vous sûr de vouloir supprimer ce grafcet ?")) {
								grafcetsManager.deleteGrafcet(grafcetId);
							}
						},
					},
				],
			];
		},
		[grafcetsManager, pagesManager, designing],
	);
}
