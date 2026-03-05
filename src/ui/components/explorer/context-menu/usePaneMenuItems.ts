"use client";

import { useAppContext } from "@/ui/components/AppContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { useCallback } from "react";

export default function usePaneMenuItems(): () => ContextMenuItemType[][] {
	const { setViewAppearance } = useAppContext();

	return useCallback(() => {
		return [
			[
				{
					label: "Masquer l'explorateur",
					onClick: () => setViewAppearance((v) => ({ ...v, showExplorer: false })),
				},
			],
		];
	}, [setViewAppearance]);
}
