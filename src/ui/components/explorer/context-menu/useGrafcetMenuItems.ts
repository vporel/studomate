"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useCallback } from "react";
import { useT } from "@/ui/i18n/useT";
import { explorerContextMenuEventsOut } from "./ExplorerContextMenu";

export default function useGrafcetMenuItems(): (
	grafcetId: string,
) => ContextMenuItemType[][] {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);

	const t = useT("explorer.menu");
	const tc = useT("explorer.confirmDelete");

	return useCallback(
		(grafcetId: string) => {
			return [
				[
					{
						label: t("open"),
						onClick: () => {
							const grafcet = grafcetsManager.getProgramOrThrow(grafcetId);
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
						label: t("rename"),
						disabled: !designing,
						onClick: () =>
							explorerContextMenuEventsOut.emit("grafcet-rename", {
								grafcetId,
							}),
						shortcut: "F2",
					},
					{
						label: t("delete"),
						disabled: !designing,
						onClick: () => {
							if (confirm(tc("grafcet"))) {
								grafcetsManager.deleteProgramById(grafcetId);
							}
						},
					},
				],
			];
		},
		[grafcetsManager, pagesManager, designing, t, tc],
	);
}
