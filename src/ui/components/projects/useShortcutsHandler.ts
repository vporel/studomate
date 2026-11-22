"use client";

import isTextEntryTarget from "@/ui/lib/is-text-entry-target";
import { canEditActivePage } from "@/ui/stores/project/editability";
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

		const handleSaveShortcut = (e: KeyboardEvent, typing: boolean) => {
			e.stopPropagation();
			e.preventDefault();
			if (e.repeat) return;
			//A field commits its value on blur: leaving it first saves what is being typed
			if (typing) (e.target as HTMLElement).blur();
			if (e.shiftKey) {
				setSaveAsModalVisible(true);
			} else if (typing) {
				setTimeout(() => void lifecycleManager.saveProject(), 0);
			} else {
				void lifecycleManager.saveProject();
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			const typing = isTextEntryTarget(e.target);
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
				//A field of a dialog keeps its native behaviour: saving behind an open modal
				//would leave the modal on screen
				if (typing && (e.target as HTMLElement).closest('[role="dialog"]'))
					return;
				handleSaveShortcut(e, typing);
				return;
			}
			if (typing) return;
			const designing = canEditActivePage(projectStore.getState());

			if (e.ctrlKey || e.metaKey) {
				switch (e.key.toLowerCase()) {
					case "o": {
						e.stopPropagation();
						e.preventDefault();
						if (!designing) break;
						setOpenModalVisible(true);
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
