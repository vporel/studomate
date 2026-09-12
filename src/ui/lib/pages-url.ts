import { getUrlQueryParam, setUrlQueryParam } from "./url-query-param";

const ACTIVE_PAGE_PARAM = "activePage";

/**
 * Permet à un lien partagé d'ouvrir directement sur une page précise du projet. Volontairement
 * séparé de la liste des onglets ouverts (voir `pages-session-storage.ts`, propre au
 * navigateur) : l'URL ne porte que ce qui doit être partageable.
 */
export function getActivePageIdFromUrl(): string | null {
	return getUrlQueryParam(ACTIVE_PAGE_PARAM);
}

/** Même politique que `setProjectIdInUrl` (`project-url.ts`) : `replaceState`, pas d'entrée d'historique. */
export function setActivePageIdInUrl(pageId: string | null): void {
	setUrlQueryParam(ACTIVE_PAGE_PARAM, pageId);
}
