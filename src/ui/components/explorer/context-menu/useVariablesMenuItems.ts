"use client";

import {
	getVariablesPageData,
	VariablesPageId,
} from "@/ui/components/pages/VariablesPage";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { useCallback } from "react";
import { useT } from "@/ui/i18n/useT";

export default function useVariablesMenuItems(): (
	variablesPageId: VariablesPageId,
) => ContextMenuItemType[][] {
	const pagesManager = useProjectStore((state) => state.pagesManager);

	const t = useT("explorer.menu");

	return useCallback(
		(variablesPageId: VariablesPageId) => {
			return [
				[
					{
						label: t("open"),
						onClick: () => {
							pagesManager.openPage(getVariablesPageData(variablesPageId));
						},
					},
				],
			];
		},
		[pagesManager, t],
	);
}
