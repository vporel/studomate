"use client";

import { useAppContext } from "@/components/AppContext";
import { ContextMenuItemType } from "@/lib/context-menu/context-menu";
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
