/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, disableNavigationPreload } from "serwist";
import handleNavigation, { type NetworkOutcome } from "./handle-navigation";
import { isExpectedPage, isOfflineNavigation } from "./navigation";

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
	}
}

declare const self: ServiceWorkerGlobalScope;

const NETWORK_TIMEOUT_MS = 3000;

const manifest = self.__SW_MANIFEST ?? [];

const serwist = new Serwist({
	precacheEntries: manifest,
	precacheOptions: { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/] },
	skipWaiting: false,
	clientsClaim: true,
});

// The setting outlives the worker on its registration: a worker that once enabled it would leave
// every navigation the handler below lets through fetched twice.
disableNavigationPreload();

const precachedPagePaths = new Set(
	manifest
		.map((entry) => (typeof entry === "string" ? entry : entry.url))
		.filter((url) => url.startsWith("/") && !/\.[a-z0-9]+$/i.test(url)),
);

async function fetchFromNetwork(event: FetchEvent): Promise<NetworkOutcome> {
	try {
		const response = await fetch(event.request);
		if (response.type === "opaqueredirect") {
			return { kind: "passthrough", response };
		}
		if (!response.ok && !response.redirected) {
			return { kind: "passthrough", response };
		}
		const html = await response.clone().text();
		return isExpectedPage(response, html, self.location.origin)
			? { kind: "page", response }
			: { kind: "unusable" };
	} catch {
		return { kind: "unusable" };
	}
}

// Registered before Serwist's own listener, which would otherwise answer precached pages from
// the cache first: pages are served network-first, the precache is only the offline fallback.
self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.mode !== "navigate" || request.method !== "GET") return;
	const { pathname } = new URL(request.url);
	if (!isOfflineNavigation(pathname, precachedPagePaths)) return;
	event.stopImmediatePropagation();
	event.respondWith(
		handleNavigation(
			pathname,
			() => fetchFromNetwork(event),
			(path) => serwist.matchPrecache(path),
			NETWORK_TIMEOUT_MS,
		),
	);
});

serwist.addEventListeners();
