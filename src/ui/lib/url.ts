/**
 * Query string changes not yet written to the history: they are applied together by a single
 * `replaceState` on the next task. Next.js's App Router mirrors every `replaceState` into its own
 * state asynchronously and writes that state back to the history on its next commit, so several
 * writes in a row let it put back an intermediate URL over the latest one.
 */
const pending = new Map<string, string | null>();
let flushScheduled = false;

function applyPending(url: URL): URL {
	for (const [name, value] of pending) {
		if (value) url.searchParams.set(name, value);
		else url.searchParams.delete(name);
	}
	return url;
}

/** Current URL of the page, including the query string changes not yet written. */
export function getCurrentUrl(): URL {
	return applyPending(new URL(window.location.href));
}

/** Value of a query string parameter, including a write not yet applied. `null` on the server. */
export function getUrlQueryParam(name: string): string | null {
	if (typeof window === "undefined") return null;
	if (pending.has(name)) return pending.get(name) ?? null;
	return new URLSearchParams(window.location.search).get(name);
}

/** Writes the pending changes now, in a single `replaceState`. */
export function flushUrlQueryParams(): void {
	flushScheduled = false;
	if (pending.size === 0) return;
	const url = getCurrentUrl();
	pending.clear();
	window.history.replaceState(null, "", url.toString());
}

/**
 * Sets a query string parameter, or removes it when `value` is `null`, without reloading the page
 * or adding a history entry. The write happens on the next task, grouped with the other changes
 * made meanwhile; `getUrlQueryParam` sees it at once.
 */
export function setUrlQueryParam(name: string, value: string | null): void {
	if (typeof window === "undefined") return;
	pending.set(name, value);
	if (flushScheduled) return;
	flushScheduled = true;
	setTimeout(flushUrlQueryParams, 0);
}
