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
	const designing = useProjectStore((state) => state.mode === ProjectMode.DESIGN);
	const canUndo = useProjectStore(canUndoActiveScope);
	const canRedo = useProjectStore(canRedoActiveScope);
	const undo = useProjectStore((state) => state.undoActiveScope);
	const redo = useProjectStore((state) => state.redoActiveScope);


	return useMemo(
		() => ({
			id: "edit",
			label: "Edition",
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
						disabled: !designing || activeScopeType !== "grafcet",
						onClick: () => {
							if (!designing) return;
							const copyCutPasteManager =
								grafcetsManager.getActiveGrafcetStoreManagers()?.copyCutPasteManager;
							copyCutPasteManager?.copySelectedElements();
						},
					},
					{
						label: "Coller",
						shortcut: platformShortcut("Ctrl+V", "Cmd+V"),
						disabled: !designing || activeScopeType !== "grafcet",
						onClick: () => {
							if (!designing) return;
							const copyCutPasteManager =
								grafcetsManager.getActiveGrafcetStoreManagers()?.copyCutPasteManager;
							copyCutPasteManager?.pasteElements();
						},
					},
				],
			],
		}),
		[activeScopeType, grafcetsManager, designing, canUndo, canRedo, undo, redo],
	);
}
