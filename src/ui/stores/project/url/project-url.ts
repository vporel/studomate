import { isLocale, type Locale } from "@/i18n/config";
import { getUrlQueryParam, setUrlQueryParam } from "@/ui/lib/url-query-param";

const PROJECT_ID_PARAM = "projectId";
const SHARE_TOKEN_PARAM = "shareToken";
const HANDOFF_PARAM = "handoff";
const TEMPLATE_ID_PARAM = "template";
const TEMPLATE_MODE_PARAM = "template-mode";
const TEMPLATE_AUTOSTART_PARAM = "template-autostart";
const TEMPLATE_LOCALE_PARAM = "template-locale";

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

/** Pose le token de partage dans l'URL pour qu'un rechargement rouvre le projet partagé. */
export function setShareTokenInUrl(token: string): void {
	setUrlQueryParam(SHARE_TOKEN_PARAM, token);
}

/** Retire le token de partage de l'URL. */
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

/** Demande dans l'URL de démarrer directement la simulation à l'ouverture du template. */
export function getTemplateAutostartFromUrl(): boolean {
	return getUrlQueryParam(TEMPLATE_AUTOSTART_PARAM) === "simulation";
}

/** Langue dans laquelle créer le template (page d'où vient le lien), ou null si absente ou inconnue. */
export function getTemplateLocaleFromUrl(): Locale | null {
	const value = getUrlQueryParam(TEMPLATE_LOCALE_PARAM);
	return isLocale(value) ? value : null;
}

/** Retire les paramètres de template de l'URL une fois le projet créé (ou le paramètre ignoré). */
export function clearTemplateParamsFromUrl(): void {
	setUrlQueryParam(TEMPLATE_ID_PARAM, null);
	setUrlQueryParam(TEMPLATE_MODE_PARAM, null);
	setUrlQueryParam(TEMPLATE_AUTOSTART_PARAM, null);
	setUrlQueryParam(TEMPLATE_LOCALE_PARAM, null);
}

/** Token d'un projet transmis par une page du site (voir `handoff.storage`), ou null. */
export function getHandoffIdFromUrl(): string | null {
	return getUrlQueryParam(HANDOFF_PARAM);
}

export function clearHandoffFromUrl(): void {
	setUrlQueryParam(HANDOFF_PARAM, null);
}
