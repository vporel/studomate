"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { useCallback } from "react";
import { useT } from "@/ui/i18n/useT";
import useCanEditProject from "@/ui/components/projects/useCanEditProject";

export default function useProgramsFolderMenuItems(): () => ContextMenuItemType[][] {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const designing = useCanEditProject();

	const t = useT("explorer.menu");

	return useCallback(() => {
		return [
			[
				{
					label: t("newGrafcet"),
					disabled: !designing,
					onClick: () => grafcetsManager.newGrafcet(),
				},
				{
					label: t("newLadder"),
					disabled: !designing,
					onClick: () => laddersManager.newLadder(),
				},
			],
		];
	}, [grafcetsManager, laddersManager, designing, t]);
}
