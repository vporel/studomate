"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useCallback } from "react";

export default function useHmiFolderMenuItems(): () => ContextMenuItemType[][] {
	const hmiManager = useProjectStore((state) => state.hmiManager);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);

	return useCallback(() => {
		return [
			[
				{
					label: "Nouvelle page HMI",
					disabled: !designing,
					onClick: () => hmiManager.newHmiPage(),
				},
			],
		];
	}, [hmiManager, designing]);
}
