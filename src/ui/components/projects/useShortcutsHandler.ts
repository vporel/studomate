"use client";

import { DEFAULT_GRAFCET_FORMAT, DEFAULT_GRAFCET_NAME } from "@/schemas/grafcet/grafcet.schema";
import { DEFAULT_LADDER_NAME } from "@/schemas/ladder/ladder.schema";
import { getLastMousePosition } from "@/ui/lib/mouse-position";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useEffect } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectContext, useProjectStore } from "./ProjectContext";

export default function useShortcutsHandler() {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const { setOpenModalVisible, saveProject } = useProjectStore(
		useShallow((state) => ({
			setOpenModalVisible: state.setOpenModalVisible,
			saveProject: state.saveProject,
		})),
	);
	const projectStore = useProjectContext();

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const isInput =
				(e.target as HTMLElement).tagName === "INPUT" ||
				(e.target as HTMLElement).tagName === "TEXTAREA";
			if (isInput) return; //Don't trigger shortcuts when the user is typing in an input or textarea
			const projectMode = projectStore?.getState().mode;
			const designing = projectMode === ProjectMode.DESIGN;

			if (e.ctrlKey || e.metaKey) {
				switch (e.key.toLowerCase()) {
					case "o": {
						e.stopPropagation();
						e.preventDefault();
						if (!designing) break;
						setOpenModalVisible(true);
						break;
					}
					case "s": {
						e.stopPropagation();
						e.preventDefault();
						void saveProject();
						break;
					}
					case "g": {
						e.stopPropagation();
						e.preventDefault();
						if (!designing) break;
						grafcetsManager.newGrafcet(DEFAULT_GRAFCET_NAME, DEFAULT_GRAFCET_FORMAT);
						break;
					}
					case "l": {
						e.stopPropagation();
						e.preventDefault();
						if (!designing) break;
						laddersManager.newLadder(DEFAULT_LADDER_NAME);
						break;
					}
					case "a": {
						e.stopPropagation();
						e.preventDefault();
						if (!designing) break;
						const activeScopeType = projectStore?.getState().activeScopeType;
						if (activeScopeType === "grafcet") {
							const grafcetViewManager =
								grafcetsManager.getActiveStoreManagers()?.viewManager;
							grafcetViewManager?.selectAllNodesAndEdges();
						} else if (activeScopeType === "ladder") {
							const ladderWorkflowManager =
								laddersManager.getActiveStoreManagers()?.workflowManager;
							ladderWorkflowManager?.selectAllInActiveSection();
						}
						break;
					}
					case "z": {
						e.stopPropagation();
						e.preventDefault();
						projectStore?.getState().undoActiveScope();
						break;
					}
					case "y": {
						e.stopPropagation();
						e.preventDefault();
						projectStore?.getState().redoActiveScope();
						break;
					}
					case "c": {
						e.stopPropagation();
						e.preventDefault();
						const activeScopeType = projectStore?.getState().activeScopeType;
						if (activeScopeType === "grafcet") {
							const copyCutPasteManager =
								grafcetsManager.getActiveStoreManagers()?.copyCutPasteManager;
							copyCutPasteManager?.copySelectedElements();
						} else if (activeScopeType === "ladder") {
							const copyCutPasteManager =
								laddersManager.getActiveStoreManagers()?.copyCutPasteManager;
							copyCutPasteManager?.copySelectedElements();
						}
						break;
					}
					case "v": {
						e.stopPropagation();
						e.preventDefault();
						const activeScopeType = projectStore?.getState().activeScopeType;
						if (activeScopeType === "grafcet") {
							const copyCutPasteManager =
								grafcetsManager.getActiveStoreManagers()?.copyCutPasteManager;
							copyCutPasteManager?.pasteElements(getLastMousePosition());
						} else if (activeScopeType === "ladder") {
							const copyCutPasteManager =
								laddersManager.getActiveStoreManagers()?.copyCutPasteManager;
							copyCutPasteManager?.pasteElements(getLastMousePosition());
						}
						break;
					}
					case "x": {
						e.stopPropagation();
						e.preventDefault();
						const activeScopeType = projectStore?.getState().activeScopeType;
						if (activeScopeType === "grafcet") {
							const copyCutPasteManager =
								grafcetsManager.getActiveStoreManagers()?.copyCutPasteManager;
							copyCutPasteManager?.cutSelectedElements();
						} else if (activeScopeType === "ladder") {
							const copyCutPasteManager =
								laddersManager.getActiveStoreManagers()?.copyCutPasteManager;
							copyCutPasteManager?.cutSelectedElements();
						}
						break;
					}
				}
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [setOpenModalVisible, saveProject, projectStore, grafcetsManager, laddersManager]);
}
