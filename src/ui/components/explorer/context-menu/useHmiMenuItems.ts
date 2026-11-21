"use client";

import { getHmiPageData } from "@/ui/stores/project/pages-data";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { useCallback } from "react";
import { useT } from "@/ui/i18n/useT";
import useDeleteHmiPageWithConfirm from "../useDeleteHmiPageWithConfirm";
import { explorerContextMenuEventsOut } from "./ExplorerContextMenu";
import useCanEditProject from "@/ui/components/projects/useCanEditProject";

export default function useHmiMenuItems(): (
	hmiPageId: string,
) => ContextMenuItemType[][] {
	const hmiManager = useProjectStore((state) => state.hmiManager);
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const designing = useCanEditProject();

	const t = useT("explorer.menu");
	const deleteHmiPage = useDeleteHmiPageWithConfirm();

	return useCallback(
		(hmiPageId: string) => {
			return [
				[
					{
						label: t("open"),
						onClick: () => {
							const page = hmiManager.getHmiPageOrThrow(hmiPageId);
							pagesManager.openPage(getHmiPageData(page));
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
						onClick: () => deleteHmiPage(hmiPageId),
					},
				],
			];
		},
		[hmiManager, pagesManager, designing, t, deleteHmiPage],
	);
}
