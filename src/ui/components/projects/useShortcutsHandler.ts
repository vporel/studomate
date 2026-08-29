"use client";

import { getLastMousePosition } from "@/ui/lib/mouse-position";
import { getClipboardEntry } from "@/ui/stores/shared/clipboard.store";
import { activeCopyCutPasteManager } from "@/ui/stores/project/copy-cut-paste";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { useShallow } from "zustand/shallow";
import { useProjectContext, useProjectStore } from "./ProjectContext";

export default function useShortcutsHandler() {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const hmiManager = useProjectStore((state) => state.hmiManager);
	const { setOpenModalVisible, saveProject, setSaveAsModalVisible } =
		useProjectStore(
			useShallow((state) => ({
				setOpenModalVisible: state.setOpenModalVisible,
				saveProject: state.saveProject,
				setSaveAsModalVisible: state.setSaveAsModalVisible,
			})),
		);
	const projectStore = useProjectContext();

	useEffect(() => {
		const getActiveCopyCutPasteManager = () =>
			projectStore
				? activeCopyCutPasteManager(projectStore.getState())
				: null;

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
						if (e.shiftKey) {
							setSaveAsModalVisible(true);
						} else {
							void saveProject();
						}
						break;
					}
					case "g": {
						e.stopPropagation();
						e.preventDefault();
						if (!designing) break;
						grafcetsManager.newGrafcet();
						break;
					}
					case "l": {
						e.stopPropagation();
						e.preventDefault();
						if (!designing) break;
						laddersManager.newLadder();
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
						} else if (activeScopeType === "hmi") {
							hmiManager.getActiveStoreManagers()?.selectAllWidgets();
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
						getActiveCopyCutPasteManager()?.copySelectedElements();
						break;
					}
					case "v": {
						e.stopPropagation();
						e.preventDefault();
						const activeScopeType = projectStore?.getState().activeScopeType;
						const entry = getClipboardEntry();
						if (
							entry &&
							(activeScopeType === "grafcet" ||
								activeScopeType === "ladder" ||
								activeScopeType === "hmi") &&
							entry.scope !== activeScopeType
						) {
							toast.error(
								"Impossible de coller ici : le presse-papiers contient des éléments d'un autre type de page.",
							);
							break;
						}
						getActiveCopyCutPasteManager()?.pasteElements(
							getLastMousePosition(),
						);
						break;
					}
					case "x": {
						e.stopPropagation();
						e.preventDefault();
						getActiveCopyCutPasteManager()?.cutSelectedElements();
						break;
					}
				}
			} else if ((e.key === "Delete" || e.key === "Backspace") && designing) {
				//Le grafcet/ladder gèrent leur propre suppression (React Flow, deleteKeyCode) :
				//seul le canvas HMI (une simple <div>, pas de mécanisme natif) en a besoin ici.
				if (projectStore?.getState().activeScopeType === "hmi") {
					e.stopPropagation();
					e.preventDefault();
					hmiManager.getActiveStoreManagers()?.removeSelectedWidgets();
				}
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [
		setOpenModalVisible,
		saveProject,
		setSaveAsModalVisible,
		projectStore,
		grafcetsManager,
		laddersManager,
		hmiManager,
	]);
}
