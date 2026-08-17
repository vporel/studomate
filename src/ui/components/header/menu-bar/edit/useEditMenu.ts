"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { platformShortcut } from "@/ui/lib/platform";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { canRedoActiveScope, canUndoActiveScope } from "@/ui/stores/project/undo-redo";
import { useMemo } from "react";
import { AppMenuType } from "../app-menu-bar";

export default function useEditMenu(): AppMenuType {
	const activeScopeType = useProjectStore((state) => state.activeScopeType);
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const designing = useProjectStore((state) => state.mode === ProjectMode.DESIGN);
	const canUndo = useProjectStore(canUndoActiveScope);
	const canRedo = useProjectStore(canRedoActiveScope);
	const undo = useProjectStore((state) => state.undoActiveScope);
	const redo = useProjectStore((state) => state.redoActiveScope);

	return useMemo(() => {
		// Copier/Couper/Coller existent aussi bien pour un grafcet que pour un ladder (voir
		// useShortcutsHandler, qui applique déjà les deux) : le menu doit refléter les deux, pas
		// seulement le grafcet.
		const isCopyCutPasteScope = activeScopeType === "grafcet" || activeScopeType === "ladder";
		const getCopyCutPasteManager = () => {
			const manager = activeScopeType === "ladder" ? laddersManager : grafcetsManager;
			return manager.getActiveStoreManagers()?.copyCutPasteManager;
		};

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
							getCopyCutPasteManager()?.copySelectedElements();
						},
					},
					{
						label: "Couper",
						shortcut: platformShortcut("Ctrl+X", "Cmd+X"),
						disabled: !designing || !isCopyCutPasteScope,
						onClick: () => {
							if (!designing) return;
							getCopyCutPasteManager()?.cutSelectedElements();
						},
					},
					{
						label: "Coller",
						shortcut: platformShortcut("Ctrl+V", "Cmd+V"),
						disabled: !designing || !isCopyCutPasteScope,
						onClick: () => {
							if (!designing) return;
							getCopyCutPasteManager()?.pasteElements();
						},
					},
				],
			],
		};
	}, [activeScopeType, grafcetsManager, laddersManager, designing, canUndo, canRedo, undo, redo]);
}
