"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
	window.addEventListener("online", onChange);
	window.addEventListener("offline", onChange);
	return () => {
		window.removeEventListener("online", onChange);
		window.removeEventListener("offline", onChange);
	};
}

/** `navigator.onLine`, kept in sync with the `online` / `offline` events (online on the server). */
export default function useOnlineStatus(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => navigator.onLine,
		() => true,
	);
}
