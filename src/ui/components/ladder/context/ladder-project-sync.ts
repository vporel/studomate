import LaddersManager from "@/ui/stores/project/managers/ladders.manager";
import { LadderStoreState } from "@/ui/stores/ladder/ladder.store";
import { StoreApi } from "zustand";

/**
 * Répercute les changements du store d'un ladder vers le projet — miroir de
 * `syncGrafcetToProject`. Voir ce fichier pour la justification du garde-fou sur la référence.
 */
export function syncLadderToProject(
	store: StoreApi<LadderStoreState>,
	laddersManager: LaddersManager,
): () => void {
	let lastLadder = store.getState().ladder;
	let lastHasCommandsToUndo = store.getState().hasCommandsToUndo;
	let lastHasCommandsToRedo = store.getState().hasCommandsToRedo;
	return store.subscribe((state) => {
		if (state.ladder !== lastLadder) {
			lastLadder = state.ladder;
			laddersManager.updateProgramData(state.ladder);
		}
		if (
			state.hasCommandsToUndo !== lastHasCommandsToUndo ||
			state.hasCommandsToRedo !== lastHasCommandsToRedo
		) {
			lastHasCommandsToUndo = state.hasCommandsToUndo;
			lastHasCommandsToRedo = state.hasCommandsToRedo;
			laddersManager.setStoreValues(state.ladder.id, {
				hasCommandsToUndo: state.hasCommandsToUndo,
				hasCommandsToRedo: state.hasCommandsToRedo,
			});
		}
	});
}
