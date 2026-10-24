"use client";

import { canEdit } from "@/ui/stores/project/editability";
import { useEffect } from "react";
import { useShallow } from "zustand/shallow";
import handleEditingShortcut from "./editing-shortcuts";
import { useProjectContext, useProjectStore } from "./ProjectContext";

/**
 * Raccourcis de l'application (ouvrir, enregistrer, nouveau grafcet / ladder) puis ceux de
 * l'édition (voir `handleEditingShortcut`), écoutés sur tout le document.
 */
export default function useShortcutsHandler() {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const { setOpenModalVisible, lifecycleManager, setSaveAsModalVisible } =
		useProjectStore(
			useShallow((state) => ({
				setOpenModalVisible: state.setOpenModalVisible,
				lifecycleManager: state.lifecycleManager,
				setSaveAsModalVisible: state.setSaveAsModalVisible,
			})),
		);
	const projectStore = useProjectContext();

	useEffect(() => {
		if (!projectStore) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			const isInput =
				(e.target as HTMLElement).tagName === "INPUT" ||
				(e.target as HTMLElement).tagName === "TEXTAREA";
			if (isInput) return; //Don't trigger shortcuts when the user is typing in an input or textarea
			const designing = canEdit(projectStore.getState());

			if (e.ctrlKey || e.metaKey) {
				switch (e.key.toLowerCase()) {
					case "o": {
						e.stopPropagation();
						e.preventDefault();
						if (!designing) break;
						setOpenModalVisible(true);
						return;
					}
					case "s": {
						e.stopPropagation();
						e.preventDefault();
						if (e.shiftKey) {
							setSaveAsModalVisible(true);
						} else {
							void lifecycleManager.saveProject();
						}
						return;
					}
					case "g": {
						e.stopPropagation();
						e.preventDefault();
						if (!designing) break;
						grafcetsManager.newGrafcet();
						return;
					}
					case "l": {
						e.stopPropagation();
						e.preventDefault();
						if (!designing) break;
						laddersManager.newLadder();
						return;
					}
				}
			}
			handleEditingShortcut(e, projectStore);
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [
		setOpenModalVisible,
		lifecycleManager,
		setSaveAsModalVisible,
		projectStore,
		grafcetsManager,
		laddersManager,
	]);
}
