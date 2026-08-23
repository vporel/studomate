const ACTIVE_PAGE_PARAM = "activePage";

/**
 * Permet à un lien partagé d'ouvrir directement sur une page précise du projet. Volontairement
 * séparé de la liste des onglets ouverts (voir `pages-session-storage.ts`, propre au
 * navigateur) : l'URL ne porte que ce qui doit être partageable.
 */
export function getActivePageIdFromUrl(): string | null {
	if (typeof window === "undefined") return null;
	return new URLSearchParams(window.location.search).get(ACTIVE_PAGE_PARAM);
}

/** Même politique que `setProjectIdInUrl` (`project-url.ts`) : `replaceState`, pas d'entrée d'historique. */
export function setActivePageIdInUrl(pageId: string | null): void {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	if (pageId) url.searchParams.set(ACTIVE_PAGE_PARAM, pageId);
	else url.searchParams.delete(ACTIVE_PAGE_PARAM);
	window.history.replaceState(null, "", url.toString());
}
