"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useCallback } from "react";
import { useT } from "@/ui/i18n/useT";
import { explorerContextMenuEventsOut } from "./ExplorerContextMenu";

export default function useLadderMenuItems(): (
	ladderId: string,
) => ContextMenuItemType[][] {
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);

	const t = useT("explorer.menu");
	const tc = useT("explorer.confirmDelete");

	return useCallback(
		(ladderId: string) => {
			return [
				[
					{
						label: t("open"),
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
						label: t("rename"),
						disabled: !designing,
						onClick: () =>
							explorerContextMenuEventsOut.emit("ladder-rename", { ladderId }),
						shortcut: "F2",
					},
					{
						label: t("delete"),
						disabled: !designing,
						onClick: () => {
							if (confirm(tc("ladder"))) {
								laddersManager.deleteProgramById(ladderId);
							}
						},
					},
				],
			];
		},
		[laddersManager, pagesManager, designing, t, tc],
	);
}
