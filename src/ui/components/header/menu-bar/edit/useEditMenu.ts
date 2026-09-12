"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import { platformShortcut } from "@/ui/lib/platform";
import { activeCopyCutPasteManager } from "@/ui/stores/project/copy-cut-paste";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import {
	canRedoActiveScope,
	canUndoActiveScope,
} from "@/ui/stores/project/undo-redo";
import { useClipboardStore } from "@/ui/stores/shared/clipboard.store";
import { useMemo } from "react";
import { AppMenuType } from "../app-menu-bar";

export default function useEditMenu(): AppMenuType {
	const activeScopeType = useProjectStore((state) => state.activeScopeType);
	const copyCutPasteManager = useProjectStore(activeCopyCutPasteManager);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);
	const canUndo = useProjectStore(canUndoActiveScope);
	const canRedo = useProjectStore(canRedoActiveScope);
	const undo = useProjectStore((state) => state.undoActiveScope);
	const redo = useProjectStore((state) => state.redoActiveScope);
	const clipboardScope = useClipboardStore((s) => s.entry?.scope);
	const t = useT("menu.edit");

	return useMemo(() => {
		// Copier/Couper/Coller existent aussi bien pour un grafcet que pour un ladder (voir
		// useShortcutsHandler, qui applique déjà les deux) : le menu doit refléter les deux, pas
		// seulement le grafcet.
		const isCopyCutPasteScope =
			activeScopeType === "grafcet" || activeScopeType === "ladder";
		const canPaste = clipboardScope === activeScopeType;

		return {
			id: "edit",
			label: t("title"),
			items: [
				[
					{
						label: t("undo"),
						shortcut: platformShortcut("Ctrl+Z", "Cmd+Z"),
						disabled: !canUndo,
						onClick: undo,
					},
					{
						label: t("redo"),
						shortcut: platformShortcut("Ctrl+Y", "Cmd+Y"),
						disabled: !canRedo,
						onClick: redo,
					},
				],
				[
					{
						label: t("copy"),
						shortcut: platformShortcut("Ctrl+C", "Cmd+C"),
						disabled: !designing || !isCopyCutPasteScope,
						onClick: () => {
							if (!designing) return;
							copyCutPasteManager?.copySelectedElements();
						},
					},
					{
						label: t("cut"),
						shortcut: platformShortcut("Ctrl+X", "Cmd+X"),
						disabled: !designing || !isCopyCutPasteScope,
						onClick: () => {
							if (!designing) return;
							copyCutPasteManager?.cutSelectedElements();
						},
					},
					{
						label: t("paste"),
						shortcut: platformShortcut("Ctrl+V", "Cmd+V"),
						disabled: !designing || !isCopyCutPasteScope || !canPaste,
						onClick: () => {
							if (!designing || !canPaste) return;
							copyCutPasteManager?.pasteElements();
						},
					},
				],
			],
		};
	}, [
		activeScopeType,
		copyCutPasteManager,
		clipboardScope,
		designing,
		canUndo,
		canRedo,
		undo,
		redo,
		t,
	]);
}
