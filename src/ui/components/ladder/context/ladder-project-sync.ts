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
	return store.subscribe((state) => {
		if (state.ladder !== lastLadder) {
			lastLadder = state.ladder;
			laddersManager.updateLadderData(state.ladder);
		}
		laddersManager.setLadderStoreValues(state.ladder.id, {
			hasCommandsToUndo: state.hasCommandsToUndo,
			hasCommandsToRedo: state.hasCommandsToRedo,
		});
	});
}
