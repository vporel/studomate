/** Lecture d'un paramètre de query string, avec garde SSR. */
export function getUrlQueryParam(name: string): string | null {
	if (typeof window === "undefined") return null;
	return new URLSearchParams(window.location.search).get(name);
}

/**
 * Écrit (ou retire si `value` est `null`) un paramètre de query string sans recharger la page
 * ni ajouter d'entrée d'historique (`replaceState`, pas `pushState`).
 */
export function setUrlQueryParam(name: string, value: string | null): void {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	if (value) url.searchParams.set(name, value);
	else url.searchParams.delete(name);
	window.history.replaceState(null, "", url.toString());
}
