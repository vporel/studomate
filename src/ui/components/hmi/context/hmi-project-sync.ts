import { StoreApi } from "zustand";
import HmiManager from "@/ui/stores/project/managers/hmi.manager";
import { HmiStoreState } from "@/ui/stores/hmi/hmi.store";
import syncEditorStoreToProject from "@/ui/stores/shared/sync-editor-store-to-project";

/**
 * Forwards the changes of an HMI page store to the project.
 *
 * @returns The unsubscribe function.
 */
export function syncHmiPageToProject(
	store: StoreApi<HmiStoreState>,
	hmiManager: HmiManager,
): () => void {
	return syncEditorStoreToProject(store, {
		select: (state) => state.hmiPage,
		push: (hmiPage) => hmiManager.updateHmiPageData(hmiPage),
		setStoreValues: (id, values) => hmiManager.setStoreValues(id, values),
	});
}
