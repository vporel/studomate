import { createBrowserSceneTransport } from "@/3d-scenes/link/scene-channel";
import { createRandomId } from "@/ids";
import routes from "@/app/routes";
import trackEvent from "@/ui/services/analytics";
import type { ProjectStoreGetFunction } from "@/ui/stores/project/project.store.types";
import type { Scene3dLinkHost } from "./scene3d-link.manager";

const SESSION_STORAGE_KEY = "studomate:3d-scene-session";

const lockName = (id: string) => `${SESSION_STORAGE_KEY}:${id}`;

function readStoredSessionId(): string | null {
	try {
		return sessionStorage.getItem(SESSION_STORAGE_KEY);
	} catch {
		return null;
	}
}

function storeSessionId(id: string): void {
	try {
		sessionStorage.setItem(SESSION_STORAGE_KEY, id);
	} catch {
		// the id then only lives in memory for this page
	}
}

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
	const stored = readStoredSessionId();
	const candidate = stored ?? createRandomId();
	pageSessionId = candidate;
	if (!stored) storeSessionId(candidate);
	if (typeof navigator === "undefined" || !navigator.locks) return candidate;
	void navigator.locks.request(
		lockName(candidate),
		{ ifAvailable: true },
		(lock) => {
			if (lock) return new Promise<void>(() => {});
			const fresh = createRandomId();
			pageSessionId = fresh;
			storeSessionId(fresh);
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
		getSnapshot: () => getStoreState().simulationManager.getScene3dSnapshot(),
		subscribeState: (listener) =>
			getStoreState().simulationManager.subscribeScene3d(listener),
		sendInteraction: (interaction) =>
			getStoreState().simulationManager.sendScene3dInteraction(interaction),
		createTransport: createBrowserSceneTransport,
		getSessionId: claimPageSession,
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
