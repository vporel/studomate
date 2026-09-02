"use client";

import { useAppContext } from "@/ui/components/AppContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { useCallback } from "react";
import { useT } from "@/ui/i18n/useT";

export default function usePaneMenuItems(): () => ContextMenuItemType[][] {
	const { setViewAppearance } = useAppContext();

	const t = useT("explorer.menu");

	return useCallback(() => {
		return [
			[
				{
					label: t("hideExplorer"),
					onClick: () => setViewAppearance((v) => ({ ...v, explorer: false })),
				},
			],
		];
	}, [setViewAppearance, t]);
}
