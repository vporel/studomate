const STORAGE_KEY = "studomate_3d_scene_session";

/**
 * The id of the 3D scene session of this tab, kept in `sessionStorage` (it is private to the tab
 * and survives a reload). `null` when none was stored or the storage is unavailable.
 */
export function getStoredScene3dSessionId(): string | null {
	try {
		return sessionStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

/** When the storage refuses, the id only lives in memory for this page. */
export function setStoredScene3dSessionId(id: string): void {
	try {
		sessionStorage.setItem(STORAGE_KEY, id);
	} catch {
		// Kept in memory only
	}
}
