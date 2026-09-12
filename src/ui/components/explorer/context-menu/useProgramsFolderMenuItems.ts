"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useCallback } from "react";
import { useT } from "@/ui/i18n/useT";

export default function useProgramsFolderMenuItems(): () => ContextMenuItemType[][] {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);

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
