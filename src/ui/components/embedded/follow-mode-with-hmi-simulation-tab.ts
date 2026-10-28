import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import type { ProjectStoreState } from "@/ui/stores/project/project.store.types";
import type { StoreApi } from "zustand";

/**
 * Opens the HMI simulation tab when the simulation starts, on the first HMI page of the block,
 * and brings back the tab that was active before it when the design mode returns. Returns the
 * function that stops following the mode.
 */
export default function followModeWithHmiSimulationTab(
	store: StoreApi<ProjectStoreState>,
): () => void {
	let activePageBeforeSimulation: string | null = null;
	return store.subscribe((state, previous) => {
		if (state.mode === previous.mode) return;
		if (state.mode === ProjectMode.SIMULATION) {
			const firstHmiPageId = state.pagesOrder.find(
				(id) => state.pagesData[id]?.type === "hmi",
			);
			if (!firstHmiPageId) return;
			activePageBeforeSimulation = state.activePageId;
			if (state.hmiManager.openHmiSimulationPageIfAny()) {
				state.hmiManager.navigateHmiSimulation(firstHmiPageId);
			}
		} else if (activePageBeforeSimulation) {
			state.pagesManager.setActivePage(activePageBeforeSimulation);
			activePageBeforeSimulation = null;
		}
	});
}
