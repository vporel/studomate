"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { platformShortcut } from "@/ui/lib/platform";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { AppMenuType } from "../app-menu-bar";

export default function useEditMenu(): AppMenuType {
	const activeScopeType = useProjectStore((state) => state.activeScopeType);
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const designing = useProjectStore((state) => state.mode === ProjectMode.DESIGN);

	const {
		projectCommandsStackManager,
		hasProjectCommandsToUndo,
		hasProjectCommandsToRedo,
		hasActiveGrafcetCommandsToUndo,
		hasActiveGrafcetCommandsToRedo,
	} = useProjectStore(
		useShallow((state) => ({
			projectCommandsStackManager: state.commandsStackManager,
			hasProjectCommandsToUndo: state.hasCommandsToUndo,
			hasProjectCommandsToRedo: state.hasCommandsToRedo,
			hasActiveGrafcetCommandsToUndo:
				state.grafcetsManager.getActiveGrafcetStoreValues()?.hasCommandsToUndo,
			hasActiveGrafcetCommandsToRedo:
				state.grafcetsManager.getActiveGrafcetStoreValues()?.hasCommandsToRedo,
		})),
	);

	return useMemo(
		() => ({
			id: "edit",
			label: "Edition",
			items: [
				[
					{
						label: "Annuler",
						shortcut: platformShortcut("Ctrl+Z", "Cmd+Z"),
						disabled:
							!designing ||
							(activeScopeType === "grafcet" && !hasActiveGrafcetCommandsToUndo) ||
							(activeScopeType === "project" && !hasProjectCommandsToUndo),
						onClick: () => {
							if (!designing) return;
							if (activeScopeType === "grafcet") {
								const grafcetCommandsStackManager =
									grafcetsManager.getActiveGrafcetStoreManagers()?.commandsStackManager;
								grafcetCommandsStackManager?.undoOperation();
							} else if (activeScopeType === "project") {
								projectCommandsStackManager.undoOperation();
							}
						},
					},
					{
						label: "Rétablir",
						shortcut: platformShortcut("Ctrl+Y", "Cmd+Y"),
						disabled:
							!designing ||
							(activeScopeType === "grafcet" && !hasActiveGrafcetCommandsToRedo) ||
							(activeScopeType === "project" && !hasProjectCommandsToRedo),
						onClick: () => {
							if (!designing) return;
							if (activeScopeType === "grafcet") {
								const grafcetCommandsStackManager =
									grafcetsManager.getActiveGrafcetStoreManagers()?.commandsStackManager;
								grafcetCommandsStackManager?.redoOperation();
							} else if (activeScopeType === "project") {
								projectCommandsStackManager.redoOperation();
							}
						},
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
		[
			activeScopeType,
			hasActiveGrafcetCommandsToUndo,
			hasProjectCommandsToUndo,
			hasActiveGrafcetCommandsToRedo,
			hasProjectCommandsToRedo,
			grafcetsManager,
			projectCommandsStackManager,
			designing,
		],
	);
}
