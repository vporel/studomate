"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useCallback } from "react";
import { explorerContextMenuEventsOut } from "./ExplorerContextMenu";

export default function useLadderMenuItems(): (ladderId: string) => ContextMenuItemType[][] {
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const designing = useProjectStore((state) => state.mode === ProjectMode.DESIGN);

	return useCallback(
		(ladderId: string) => {
			return [
				[
					{
						label: "Ouvrir",
						onClick: () => {
							const ladder = laddersManager.getProgramOrThrow(ladderId);
							if (ladder) {
								pagesManager.openPage({
									id: ladderId,
									type: "ladder",
									title: ladder.name,
								});
							}
						},
					},
				],
				[
					{
						label: "Renommer",
						disabled: !designing,
						onClick: () => explorerContextMenuEventsOut.emit("ladder-rename", { ladderId }),
						shortcut: "F2",
					},
					{
						label: "Supprimer",
						disabled: !designing,
						onClick: () => {
							if (confirm("Êtes-vous sûr de vouloir supprimer ce ladder ?")) {
								laddersManager.deleteProgramById(ladderId);
							}
						},
					},
				],
			];
		},
		[laddersManager, pagesManager, designing],
	);
}
