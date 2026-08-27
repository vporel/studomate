import { StoreApi } from "zustand";
import HmiManager from "@/ui/stores/project/managers/hmi.manager";
import { HmiStoreState } from "@/ui/stores/hmi/hmi.store";

/**
 * Répercute les changements du store d'une page HMI vers le projet — même principe que
 * `syncGrafcetToProject` (voir ce fichier pour le détail du garde-fou sur la référence).
 *
 * @returns La fonction de désabonnement.
 */
export function syncHmiPageToProject(
	store: StoreApi<HmiStoreState>,
	hmiManager: HmiManager,
): () => void {
	let lastHmiPage = store.getState().hmiPage;
	let lastHasCommandsToUndo = store.getState().hasCommandsToUndo;
	let lastHasCommandsToRedo = store.getState().hasCommandsToRedo;
	return store.subscribe((state) => {
		if (state.hmiPage !== lastHmiPage) {
			lastHmiPage = state.hmiPage;
			hmiManager.updateHmiPageData(state.hmiPage);
		}
		if (
			state.hasCommandsToUndo !== lastHasCommandsToUndo ||
			state.hasCommandsToRedo !== lastHasCommandsToRedo
		) {
			lastHasCommandsToUndo = state.hasCommandsToUndo;
			lastHasCommandsToRedo = state.hasCommandsToRedo;
			hmiManager.setStoreValues(state.hmiPage.id, {
				hasCommandsToUndo: state.hasCommandsToUndo,
				hasCommandsToRedo: state.hasCommandsToRedo,
			});
		}
	});
}
