"use client";

import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { platformShortcut } from "@/ui/lib/platform";
import { useCallback } from "react";

export default function useHmiPaneMenuItems(): () => ContextMenuItemType[][] {
	const widgetsCount = useHmiStore(
		(s) => Object.keys(s.hmiPage.widgets).length,
	);
	const selectAllWidgets = useHmiStore((s) => s.selectAllWidgets);
	const copyCutPasteManager = useHmiStore((s) => s.copyCutPasteManager);

	return useCallback(() => {
		return [
			[
				{
					label: "Tout sélectionner",
					shortcut: platformShortcut("Ctrl+A", "Cmd+A"),
					onClick: selectAllWidgets,
					disabled: widgetsCount === 0,
				},
			],
			[
				{
					label: "Coller",
					shortcut: platformShortcut("Ctrl+V", "Cmd+V"),
					onClick: () => copyCutPasteManager.pasteWidgets(),
				},
			],
		];
	}, [selectAllWidgets, widgetsCount, copyCutPasteManager]);
}
