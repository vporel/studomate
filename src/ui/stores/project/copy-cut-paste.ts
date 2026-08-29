import { ProjectStoreState } from "./project.store";

/**
 * Interface commune des trois gestionnaires copier/couper/coller (grafcet, ladder, HMI —
 * voir `AbstractCopyCutPasteManager`).
 */
export type CopyCutPasteController = {
	copySelectedElements: () => void;
	pasteElements: (mousePosition?: { x: number; y: number }) => void;
	cutSelectedElements: () => void;
};

/**
 * Copier/couper/coller est adressé au document actif, comme l'undo/redo (voir `undo-redo.ts`) :
 * ce helper est le seul endroit où l'on résout, selon le scope actif, quel gestionnaire agit.
 * Il prend l'état plutôt que d'être un hook, pour servir aussi bien les composants que le
 * gestionnaire clavier impératif.
 */
export function activeCopyCutPasteManager(
	state: ProjectStoreState,
): CopyCutPasteController | null {
	switch (state.activeScopeType) {
		case "grafcet":
			return (
				state.grafcetsManager.getActiveStoreManagers()?.copyCutPasteManager ??
				null
			);
		case "ladder":
			return (
				state.laddersManager.getActiveStoreManagers()?.copyCutPasteManager ??
				null
			);
		case "hmi":
			return (
				state.hmiManager.getActiveStoreManagers()?.copyCutPasteManager ?? null
			);
		default:
			return null;
	}
}
