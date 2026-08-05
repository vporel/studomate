const PROJECT_ID_PARAM = "projectId";

/**
 * Permet de recharger la page sans perdre le projet ouvert : l'id voyage dans l'URL plutôt que
 * dans le seul état mémoire du store.
 */
export function getProjectIdFromUrl(): string | null {
	if (typeof window === "undefined") return null;
	return new URLSearchParams(window.location.search).get(PROJECT_ID_PARAM);
}

/**
 * Met à jour l'URL sans recharger la page ni polluer l'historique de navigation (`replaceState`,
 * pas `pushState` : ouvrir un projet n'est pas une étape qu'on veut revisiter avec le bouton
 * "précédent" du navigateur).
 */
export function setProjectIdInUrl(projectId: string | null): void {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	if (projectId) url.searchParams.set(PROJECT_ID_PARAM, projectId);
	else url.searchParams.delete(PROJECT_ID_PARAM);
	window.history.replaceState(null, "", url.toString());
}
