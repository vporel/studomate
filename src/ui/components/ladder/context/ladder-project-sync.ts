import LaddersManager from "@/ui/stores/project/managers/ladders.manager";
import { LadderStoreState } from "@/ui/stores/ladder/ladder.store";
import syncEditorStoreToProject from "@/ui/stores/shared/sync-editor-store-to-project";
import { StoreApi } from "zustand";

/**
 * Forwards the changes of a ladder store to the project.
 *
 * @returns The unsubscribe function.
 */
export function syncLadderToProject(
	store: StoreApi<LadderStoreState>,
	laddersManager: LaddersManager,
): () => void {
	return syncEditorStoreToProject(store, {
		select: (state) => state.ladder,
		push: (ladder) => laddersManager.updateProgramData(ladder),
		setStoreValues: (id, values) => laddersManager.setStoreValues(id, values),
	});
}
