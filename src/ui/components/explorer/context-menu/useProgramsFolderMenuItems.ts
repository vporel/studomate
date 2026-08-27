"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useCallback } from "react";

export default function useProgramsFolderMenuItems(): () => ContextMenuItemType[][] {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);

	return useCallback(() => {
		return [
			[
				{
					label: "Nouveau grafcet",
					disabled: !designing,
					onClick: () => grafcetsManager.newGrafcet(),
				},
				{
					label: "Nouveau ladder",
					disabled: !designing,
					onClick: () => laddersManager.newLadder(),
				},
			],
		];
	}, [grafcetsManager, laddersManager, designing]);
}
