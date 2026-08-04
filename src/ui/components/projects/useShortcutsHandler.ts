"use client";

import { DEFAULT_GRAFCET_FORMAT, DEFAULT_GRAFCET_NAME } from "@/schemas/grafcet/grafcet.schema";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import React, { useEffect } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectContext, useProjectStore } from "./ProjectContext";

export default function useShortcutsHandler() {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const { setOpenModalVisible, saveProject } = useProjectStore(
		useShallow((state) => ({
			setOpenModalVisible: state.setOpenModalVisible,
			saveProject: state.saveProject,
		})),
	);
	const projectStore = useProjectContext();

	useEffect(() => {
		const handleKeyDown = (e: React.KeyboardEvent) => {
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
						saveProject();
						break;
					}
					case "g": {
						e.stopPropagation();
						e.preventDefault();
						if (!designing) break;
						grafcetsManager.newGrafcet(DEFAULT_GRAFCET_NAME, DEFAULT_GRAFCET_FORMAT);
						break;
					}
					case "a": {
						e.stopPropagation();
						e.preventDefault();
						if (!designing) break;
						const activeScopeType = projectStore?.getState().activeScopeType;
						if (activeScopeType === "grafcet") {
							const grafcetViewManager =
								grafcetsManager.getActiveGrafcetStoreManagers()?.viewManager;
							grafcetViewManager?.selectAllNodesAndEdges();
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
						if (!designing) break;
						const activeScopeType = projectStore?.getState().activeScopeType;
						if (activeScopeType === "grafcet") {
							const copyCutPasteManager =
								grafcetsManager.getActiveGrafcetStoreManagers()?.copyCutPasteManager;
							copyCutPasteManager?.copySelectedElements();
						}
						break;
					}
					case "v": {
						e.stopPropagation();
						e.preventDefault();
						if (!designing) break;
						const activeScopeType = projectStore?.getState().activeScopeType;
						if (activeScopeType === "grafcet") {
							const copyCutPasteManager =
								grafcetsManager.getActiveGrafcetStoreManagers()?.copyCutPasteManager;
							copyCutPasteManager?.pasteElements(projectStore?.getState().mousePosition);
						}
						break;
					}
				}
			}
		};
		document.addEventListener("keydown", handleKeyDown as any);
		return () => {
			document.removeEventListener("keydown", handleKeyDown as any);
		};
	}, [setOpenModalVisible, saveProject, projectStore, grafcetsManager]);
}
