import type { ProjectStoreState } from "./project.store.types";

/**
 * The manager of the documents the active scope belongs to (grafcets, ladders or HMI pages), or
 * `null` when the active scope is the project itself.
 */
export default function activeDocumentsManager(state: ProjectStoreState) {
	switch (state.activeScopeType) {
		case "grafcet":
			return state.grafcetsManager;
		case "ladder":
			return state.laddersManager;
		case "hmi":
			return state.hmiManager;
		default:
			return null;
	}
}
