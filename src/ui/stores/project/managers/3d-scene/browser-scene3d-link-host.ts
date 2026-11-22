import { createBrowserSceneTransport } from "@/3d-scenes/link/scene-channel";
import { createRandomId } from "@/ids";
import {
	getStoredScene3dSessionId,
	setStoredScene3dSessionId,
} from "@/persistence/scene3d-session.storage";
import routes from "@/app/routes";
import trackEvent from "@/ui/services/analytics";
import type { ProjectStoreGetFunction } from "@/ui/stores/project/project.store.types";
import type { Scene3dLinkHost } from "./scene3d-link.manager";

const LOCK_NAME_PREFIX = "studomate:3d-scene-session";

const lockName = (id: string) => `${LOCK_NAME_PREFIX}:${id}`;

/** Holds the lock until the page is destroyed, when the browser releases it. */
function holdSessionLock(id: string, options?: LockOptions): void {
	void navigator.locks.request(
		lockName(id),
		options ?? {},
		() => new Promise<void>(() => {}),
	);
}

let pageSessionId: string | null = null;

/**
 * One session id per page. `sessionStorage` is copied when a tab is duplicated, so the stored
 * id is only kept if no other live tab holds its lock; otherwise the page switches to a new id.
 * The id returned before the lock answers (a few ms after page load) is the candidate one.
 */
function claimPageSession(): string {
	if (pageSessionId) return pageSessionId;
	const stored = getStoredScene3dSessionId();
	const candidate = stored ?? createRandomId();
	pageSessionId = candidate;
	if (!stored) setStoredScene3dSessionId(candidate);
	if (typeof navigator === "undefined" || !navigator.locks) return candidate;
	void navigator.locks.request(
		lockName(candidate),
		{ ifAvailable: true },
		(lock) => {
			if (lock) return new Promise<void>(() => {});
			const fresh = createRandomId();
			pageSessionId = fresh;
			setStoredScene3dSessionId(fresh);
			holdSessionLock(fresh);
			return undefined;
		},
	);
	return candidate;
}

/** Host of the link in the real application: the tab, its storage and the project store. */
export default function createBrowserScene3dLinkHost(
	getStoreState: ProjectStoreGetFunction,
): Scene3dLinkHost {
	claimPageSession();
	return {
		getScene: () => getStoreState().project?.scene3d ?? null,
		getProjectName: () => getStoreState().project?.name ?? "",
		getSnapshot: () => getStoreState().simulationManager.getScene3dSnapshot(),
		subscribeState: (listener) =>
			getStoreState().simulationManager.subscribeScene3d(listener),
		sendInteraction: (interaction) =>
			getStoreState().simulationManager.sendScene3dInteraction(interaction),
		createTransport: createBrowserSceneTransport,
		connectScene: createBrowserSceneTransport,
		getSessionId: claimPageSession,
		openWindow: (sessionId) => {
			const opened = window.open(
				`${routes.scene()}?session=${encodeURIComponent(sessionId)}`,
				`studomate-3d-scene-${sessionId}`,
			);
			if (!opened) return false;
			trackEvent("scene-opened", {
				scene: getStoreState().project?.scene3d?.sceneId,
				mode: "window",
			});
			return true;
		},
		now: () => Date.now(),
	};
}
