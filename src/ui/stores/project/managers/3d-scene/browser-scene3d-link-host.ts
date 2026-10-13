import { createBrowserSceneTransport } from "@/3d-scenes/link/scene-channel";
import { createRandomId } from "@/ids";
import routes from "@/app/routes";
import trackEvent from "@/ui/services/analytics";
import type { ProjectStoreGetFunction } from "@/ui/stores/project/project.store.types";
import type { Scene3dLinkHost } from "./scene3d-link.manager";

const SESSION_STORAGE_KEY = "studomate:3d-scene-session";

function readOrCreateSessionId(): string {
	try {
		const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
		if (stored) return stored;
		const created = createRandomId();
		sessionStorage.setItem(SESSION_STORAGE_KEY, created);
		return created;
	} catch {
		return createRandomId();
	}
}

/** Host of the link in the real application: the tab, its storage and the project store. */
export default function createBrowserScene3dLinkHost(
	getStoreState: ProjectStoreGetFunction,
): Scene3dLinkHost {
	let fallbackSessionId: string | null = null;
	return {
		getScene: () => getStoreState().project?.scene3d ?? null,
		getSnapshot: () => getStoreState().simulationManager.getScene3dSnapshot(),
		subscribeState: (listener) =>
			getStoreState().simulationManager.subscribeScene3d(listener),
		sendInteraction: (interaction) =>
			getStoreState().simulationManager.sendScene3dInteraction(interaction),
		createTransport: createBrowserSceneTransport,
		getSessionId: () => {
			const id = readOrCreateSessionId();
			fallbackSessionId ??= id;
			return fallbackSessionId;
		},
		openWindow: (sessionId) => {
			trackEvent("scene-opened");
			window.open(
				`${routes.scene()}?session=${encodeURIComponent(sessionId)}`,
				`studomate-3d-scene-${sessionId}`,
			);
		},
		now: () => Date.now(),
	};
}
