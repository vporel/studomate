import { StoreApi } from "zustand";
import GrafcetsManager from "@/ui/stores/project/managers/grafcets.manager";
import { GrafcetStoreState } from "@/ui/stores/grafcet/grafcet.store";
import syncEditorStoreToProject from "@/ui/stores/shared/sync-editor-store-to-project";

/**
 * Forwards the changes of a grafcet store to the project.
 *
 * @returns The unsubscribe function.
 */
export function syncGrafcetToProject(
	store: StoreApi<GrafcetStoreState>,
	grafcetsManager: GrafcetsManager,
): () => void {
	return syncEditorStoreToProject(store, {
		select: (state) => state.grafcet,
		push: (grafcet) => grafcetsManager.updateProgramData(grafcet),
		setStoreValues: (id, values) => grafcetsManager.setStoreValues(id, values),
	});
}
