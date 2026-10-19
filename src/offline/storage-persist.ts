/**
 * Asks the browser to keep this origin's storage (service worker caches and `localStorage`,
 * the only copy of local projects) out of eviction. Silent when the API is missing or refuses.
 */
export default async function requestPersistentStorage(): Promise<boolean> {
	try {
		if (typeof navigator === "undefined" || !navigator.storage?.persist) {
			return false;
		}
		if (await navigator.storage.persisted?.()) return true;
		return await navigator.storage.persist();
	} catch {
		return false;
	}
}
