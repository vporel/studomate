"use client";

import { getVariablesPageData, VariablesPageId } from "@/components/pages/VariablesPage";
import { useProjectStore } from "@/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/lib/context-menu/context-menu";
import { useCallback } from "react";

export default function useVariablesMenuItems(): (
	variablesPageId: VariablesPageId,
) => ContextMenuItemType[][] {
	const pagesManager = useProjectStore((state) => state.pagesManager);

	return useCallback(
		(variablesPageId: VariablesPageId) => {
			return [
				[
					{
						label: "Ouvrir",
						onClick: () => {
							pagesManager.openPage(getVariablesPageData(variablesPageId));
						},
					},
				],
			];
		},
		[pagesManager],
	);
}
