"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useCallback } from "react";
import { useT } from "@/ui/i18n/useT";
import { explorerContextMenuEventsOut } from "./ExplorerContextMenu";

export default function useHmiMenuItems(): (
	hmiPageId: string,
) => ContextMenuItemType[][] {
	const hmiManager = useProjectStore((state) => state.hmiManager);
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);

	const t = useT("explorer.menu");
	const tc = useT("explorer.confirmDelete");

	return useCallback(
		(hmiPageId: string) => {
			return [
				[
					{
						label: t("open"),
						onClick: () => {
							const page = hmiManager.getHmiPageOrThrow(hmiPageId);
							pagesManager.openPage({
								id: hmiPageId,
								type: "hmi",
								title: page.name,
							});
						},
					},
				],
				[
					{
						label: t("rename"),
						disabled: !designing,
						onClick: () =>
							explorerContextMenuEventsOut.emit("hmi-rename", { hmiPageId }),
						shortcut: "F2",
					},
					{
						label: t("delete"),
						disabled: !designing,
						onClick: () => {
							if (
								confirm(tc("hmiPage"))
							) {
								hmiManager.deleteHmiPage(hmiPageId);
							}
						},
					},
				],
			];
		},
		[hmiManager, pagesManager, designing, t, tc],
	);
}
