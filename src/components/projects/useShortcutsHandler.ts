"use client";

import { DEFAULT_GRAFCET_FORMAT, DEFAULT_GRAFCET_NAME } from "@/schemas/grafcet/Grafcet.class";
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
			if (e.ctrlKey || e.metaKey) {
				switch (e.key.toLowerCase()) {
					case "o": {
						e.stopPropagation();
						e.preventDefault();
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
						grafcetsManager.newGrafcet(DEFAULT_GRAFCET_NAME, DEFAULT_GRAFCET_FORMAT);
						break;
					}
					case "a": {
						e.stopPropagation();
						e.preventDefault();
						const activeScopeType = projectStore?.getState().activeScopeType;
						if (activeScopeType === "grafcet") {
							const actions = grafcetsManager.getActiveGrafcetStoreActions();
							actions?.selectAllNodesAndEdges();
						}
						break;
					}
					case "z": {
						e.stopPropagation();
						e.preventDefault();
						const activeScopeType = projectStore?.getState().activeScopeType;
						if (activeScopeType === "grafcet") {
							const actions = grafcetsManager.getActiveGrafcetStoreActions();
							actions?.undoOperation();
						} else if (activeScopeType === "project") {
							projectStore?.getState().commandsStackManager.undoOperation();
						}
						break;
					}
					case "y": {
						e.stopPropagation();
						e.preventDefault();
						const activeScopeType = projectStore?.getState().activeScopeType;
						if (activeScopeType === "grafcet") {
							const actions = grafcetsManager.getActiveGrafcetStoreActions();
							actions?.redoOperation();
						} else if (activeScopeType === "project") {
							projectStore?.getState().commandsStackManager.redoOperation();
						}
						break;
					}
					case "c": {
						e.stopPropagation();
						e.preventDefault();
						const activeScopeType = projectStore?.getState().activeScopeType;
						if (activeScopeType === "grafcet") {
							const actions = grafcetsManager.getActiveGrafcetStoreActions();
							actions?.copySelectedElements();
						}
						break;
					}
					case "v": {
						e.stopPropagation();
						e.preventDefault();
						const activeScopeType = projectStore?.getState().activeScopeType;
						if (activeScopeType === "grafcet") {
							const actions = grafcetsManager.getActiveGrafcetStoreActions();
							actions?.pasteCopiedElements(projectStore?.getState().mousePosition);
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
