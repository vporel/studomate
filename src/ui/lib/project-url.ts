import { getUrlQueryParam, setUrlQueryParam } from "./url-query-param";

const PROJECT_ID_PARAM = "projectId";
const SHARE_TOKEN_PARAM = "shareToken";
const TEMPLATE_ID_PARAM = "template";
const TEMPLATE_MODE_PARAM = "template-mode";

export type TemplateMode = "exercise" | "solution";

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

/** Retourne l'id de template présent dans l'URL (lien "Ouvrir dans l'application"), ou null. */
export function getTemplateIdFromUrl(): string | null {
	return getUrlQueryParam(TEMPLATE_ID_PARAM);
}

/** Variante de template demandée dans l'URL — `"exercise"` par défaut, y compris si la valeur est invalide. */
export function getTemplateModeFromUrl(): TemplateMode {
	return getUrlQueryParam(TEMPLATE_MODE_PARAM) === "solution"
		? "solution"
		: "exercise";
}

/** Retire les paramètres de template de l'URL une fois le projet créé (ou le paramètre ignoré). */
export function clearTemplateParamsFromUrl(): void {
	setUrlQueryParam(TEMPLATE_ID_PARAM, null);
	setUrlQueryParam(TEMPLATE_MODE_PARAM, null);
}
