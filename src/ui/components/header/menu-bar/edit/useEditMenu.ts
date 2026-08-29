"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
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

	return useMemo(() => {
		// Copier/Couper/Coller existent aussi bien pour un grafcet que pour un ladder (voir
		// useShortcutsHandler, qui applique déjà les deux) : le menu doit refléter les deux, pas
		// seulement le grafcet.
		const isCopyCutPasteScope =
			activeScopeType === "grafcet" || activeScopeType === "ladder";
		const canPaste = clipboardScope === activeScopeType;

		return {
			id: "edit",
			label: "Édition",
			items: [
				[
					{
						label: "Annuler",
						shortcut: platformShortcut("Ctrl+Z", "Cmd+Z"),
						disabled: !canUndo,
						onClick: undo,
					},
					{
						label: "Rétablir",
						shortcut: platformShortcut("Ctrl+Y", "Cmd+Y"),
						disabled: !canRedo,
						onClick: redo,
					},
				],
				[
					{
						label: "Copier",
						shortcut: platformShortcut("Ctrl+C", "Cmd+C"),
						disabled: !designing || !isCopyCutPasteScope,
						onClick: () => {
							if (!designing) return;
							copyCutPasteManager?.copySelectedElements();
						},
					},
					{
						label: "Couper",
						shortcut: platformShortcut("Ctrl+X", "Cmd+X"),
						disabled: !designing || !isCopyCutPasteScope,
						onClick: () => {
							if (!designing) return;
							copyCutPasteManager?.cutSelectedElements();
						},
					},
					{
						label: "Coller",
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
	]);
}
