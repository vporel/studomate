import { createInMemoryTransportPair } from "@/3d-scenes/link/in-memory-transport";
import type { SceneTransport } from "@/3d-scenes/link/scene-channel";
import type { ProjectStoreGetFunction } from "@/ui/stores/project/project.store.types";
import type { Scene3dLinkHost } from "./scene3d-link.manager";

/**
 * Host of the link for a scene shown in the same page as its editor: no second tab and no
 * browser storage, the two ends are linked in memory.
 */
export default function createInProcessScene3dLinkHost(
	getStoreState: ProjectStoreGetFunction,
): Scene3dLinkHost {
	const sceneEnds = new Map<string, SceneTransport>();
	return {
		getScene: () => getStoreState().project?.scene3d ?? null,
		getProjectName: () => getStoreState().project?.name ?? "",
		getSnapshot: () => getStoreState().simulationManager.getScene3dSnapshot(),
		subscribeState: (listener) =>
			getStoreState().simulationManager.subscribeScene3d(listener),
		sendInteraction: (interaction) =>
			getStoreState().simulationManager.sendScene3dInteraction(interaction),
		createTransport: (sessionId) => {
			const [editorEnd, sceneEnd] = createInMemoryTransportPair();
			sceneEnds.set(sessionId, sceneEnd);
			return editorEnd;
		},
		connectScene: (sessionId) => {
			const sceneEnd = sceneEnds.get(sessionId);
			if (!sceneEnd) {
				throw new Error(`No editor end is linked for session "${sessionId}"`);
			}
			sceneEnds.delete(sessionId);
			return sceneEnd;
		},
		getSessionId: () => "in-process",
		openWindow: () => false,
		now: () => Date.now(),
	};
}
