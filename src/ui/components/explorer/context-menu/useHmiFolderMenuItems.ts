"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { useCallback } from "react";
import { useT } from "@/ui/i18n/useT";
import useCanEditProject from "@/ui/components/projects/useCanEditProject";

export default function useHmiFolderMenuItems(): () => ContextMenuItemType[][] {
	const hmiManager = useProjectStore((state) => state.hmiManager);
	const designing = useCanEditProject();

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
