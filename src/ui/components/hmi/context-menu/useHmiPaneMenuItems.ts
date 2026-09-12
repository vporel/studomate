"use client";

import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { platformShortcut } from "@/ui/lib/platform";
import { useClipboardStore } from "@/ui/stores/shared/clipboard.store";
import { useCallback } from "react";
import { useT } from "@/ui/i18n/useT";

export default function useHmiPaneMenuItems(): () => ContextMenuItemType[][] {
	const widgetsCount = useHmiStore(
		(s) => Object.keys(s.hmiPage.widgets).length,
	);
	const selectAllWidgets = useHmiStore((s) => s.selectAllWidgets);
	const copyCutPasteManager = useHmiStore((s) => s.copyCutPasteManager);
	const canPaste = useClipboardStore((s) => s.entry?.scope === "hmi");
	const t = useT("hmiEditor.menu");

	return useCallback(() => {
		return [
			[
				{
					label: t("selectAll"),
					shortcut: platformShortcut("Ctrl+A", "Cmd+A"),
					onClick: selectAllWidgets,
					disabled: widgetsCount === 0,
				},
			],
			[
				{
					label: t("paste"),
					shortcut: platformShortcut("Ctrl+V", "Cmd+V"),
					onClick: () => copyCutPasteManager.pasteElements(),
					disabled: !canPaste,
				},
			],
		];
	}, [selectAllWidgets, widgetsCount, copyCutPasteManager, canPaste, t]);
}
