"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useCallback } from "react";
import { useT } from "@/ui/i18n/useT";

export default function useHmiFolderMenuItems(): () => ContextMenuItemType[][] {
	const hmiManager = useProjectStore((state) => state.hmiManager);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);

	const t = useT("explorer.menu");

	return useCallback(() => {
		return [
			[
				{
					label: t("newHmiPage"),
					disabled: !designing,
					onClick: () => hmiManager.newHmiPage(),
				},
			],
		];
	}, [hmiManager, designing, t]);
}
