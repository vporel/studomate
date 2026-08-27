import { getUrlQueryParam, setUrlQueryParam } from "./url-query-param";

const PROJECT_ID_PARAM = "projectId";
const SHARE_TOKEN_PARAM = "shareToken";

/**
 * Permet de recharger la page sans perdre le projet ouvert : l'id voyage dans l'URL plutôt que
 * dans le seul état mémoire du store.
 */
export function getProjectIdFromUrl(): string | null {
	return getUrlQueryParam(PROJECT_ID_PARAM);
}

/**
 * Met à jour l'URL sans recharger la page ni polluer l'historique de navigation : ouvrir un
 * projet n'est pas une étape qu'on veut revisiter avec le bouton "précédent" du navigateur.
 */
export function setProjectIdInUrl(projectId: string | null): void {
	setUrlQueryParam(PROJECT_ID_PARAM, projectId);
}

/** Retourne le token de partage présent dans l'URL, ou null. */
export function getShareTokenFromUrl(): string | null {
	return getUrlQueryParam(SHARE_TOKEN_PARAM);
}

/** Retire le token de partage de l'URL une fois le projet chargé. */
export function clearShareTokenFromUrl(): void {
	setUrlQueryParam(SHARE_TOKEN_PARAM, null);
}
