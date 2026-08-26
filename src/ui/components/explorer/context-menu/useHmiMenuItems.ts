"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useCallback } from "react";
import { explorerContextMenuEventsOut } from "./ExplorerContextMenu";

export default function useHmiMenuItems(): (hmiPageId: string) => ContextMenuItemType[][] {
	const hmiManager = useProjectStore((state) => state.hmiManager);
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const designing = useProjectStore((state) => state.mode === ProjectMode.DESIGN);

	return useCallback(
		(hmiPageId: string) => {
			return [
				[
					{
						label: "Ouvrir",
						onClick: () => {
							const page = hmiManager.getHmiPageOrThrow(hmiPageId);
							pagesManager.openPage({ id: hmiPageId, type: "hmi", title: page.name });
						},
					},
				],
				[
					{
						label: "Renommer",
						disabled: !designing,
						onClick: () => explorerContextMenuEventsOut.emit("hmi-rename", { hmiPageId }),
						shortcut: "F2",
					},
					{
						label: "Supprimer",
						disabled: !designing,
						onClick: () => {
							if (confirm("Êtes-vous sûr de vouloir supprimer cette page HMI ?")) {
								hmiManager.deleteHmiPage(hmiPageId);
							}
						},
					},
				],
			];
		},
		[hmiManager, pagesManager, designing],
	);
}
