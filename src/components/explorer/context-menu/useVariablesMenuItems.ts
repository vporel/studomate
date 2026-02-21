"use client";

import { getVariablesPageData, VariablesPageId } from "@/components/pages/VariablesPage";
import { useProjectStore } from "@/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/lib/context-menu/context-menu";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";

export default function useVariablesMenuItems(): (
	variablesPageId: VariablesPageId,
) => ContextMenuItemType[][] {
	const { openPage } = useProjectStore(
		useShallow((state) => ({
			openPage: state.openPage,
		})),
	);

	return useCallback(
		(variablesPageId: VariablesPageId) => {
			return [
				[
					{
						label: "Ouvrir",
						onClick: () => {
							openPage(getVariablesPageData(variablesPageId));
						},
					},
				],
			];
		},
		[openPage],
	);
}
