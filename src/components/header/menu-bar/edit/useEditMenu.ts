"use client";

import { useProjectStore } from "@/components/projects/ProjectContext";
import { platformShortcut } from "@/lib/platform";
import { useMemo } from "react";
import { AppMenuType } from "../app-menu-bar";

export default function useEditMenu(): AppMenuType {
	const activeScopeType = useProjectStore((state) => state.activeScopeType);
	const getActiveGrafcetStoreActions = useProjectStore((state) => state.getActiveGrafcetStoreActions);
	const hasActiveGrafcetCommandsToUndo = useProjectStore(
		(state) => state.getActiveGrafcetStoreValues()?.hasCommandsToUndo,
	);
	const hasActiveGrafcetCommandsToRedo = useProjectStore(
		(state) => state.getActiveGrafcetStoreValues()?.hasCommandsToRedo,
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
						disabled: activeScopeType !== "grafcet" || !hasActiveGrafcetCommandsToUndo,
						onClick: () => {
							const actions = getActiveGrafcetStoreActions();
							actions?.undoOperation();
						},
					},
					{
						label: "Rétablir",
						shortcut: platformShortcut("Ctrl+Y", "Cmd+Y"),
						disabled: activeScopeType !== "grafcet" || !hasActiveGrafcetCommandsToRedo,
						onClick: () => {
							const actions = getActiveGrafcetStoreActions();
							actions?.redoOperation();
						},
					},
				],
				[
					{
						label: "Copier",
						shortcut: platformShortcut("Ctrl+C", "Cmd+C"),
						disabled: activeScopeType !== "grafcet",
						onClick: () => {
							const actions = getActiveGrafcetStoreActions();
							actions?.copySelectedElements();
						},
					},
					{
						label: "Coller",
						shortcut: platformShortcut("Ctrl+V", "Cmd+V"),
						disabled: activeScopeType !== "grafcet",
						onClick: () => {
							const actions = getActiveGrafcetStoreActions();
							actions?.pasteCopiedElements();
						},
					},
				],
			],
		}),
		[
			activeScopeType,
			getActiveGrafcetStoreActions,
			hasActiveGrafcetCommandsToUndo,
			hasActiveGrafcetCommandsToRedo,
		],
	);
}
