import { detectBrowserLocale, isLocale, type Locale } from "@/i18n/config";
import { StorageLocation } from "./repositories/project.repository";

const STORAGE_KEY = "studomate_preferred_save_location";
const LOCALE_STORAGE_KEY = "studomate_locale";

/**
 * Lieu de stockage par défaut choisi par l'utilisateur (page Préférences, ou premier
 * enregistrement d'un projet neuf). `null` tant qu'aucun choix n'a jamais été fait — c'est ce qui
 * déclenche la modale de choix au tout premier enregistrement.
 */
export function getPreferredSaveLocation(): StorageLocation | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw === "local" || raw === "cloud" ? raw : null;
	} catch {
		return null;
	}
}

export function setPreferredSaveLocation(location: StorageLocation): void {
	try {
		localStorage.setItem(STORAGE_KEY, location);
	} catch {
		// Stockage indisponible : la préférence ne sera simplement pas retenue
	}
}

/**
 * Langue de l'interface choisie par l'utilisateur. `null` tant qu'aucun choix explicite n'a
 * été fait — l'appelant retombe alors sur la langue du navigateur.
 */
export function getPreferredLocale(): Locale | null {
	try {
		const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
		return isLocale(raw) ? raw : null;
	} catch {
		return null;
	}
}

export function setPreferredLocale(locale: Locale): void {
	try {
		localStorage.setItem(LOCALE_STORAGE_KEY, locale);
	} catch {
		// Stockage indisponible : la préférence ne sera simplement pas retenue
	}
}

/**
 * Langue effective de l'interface : le choix explicite de l'utilisateur, sinon la langue du
 * navigateur. Pour le code hors React (managers zustand, mappers) qui a besoin de la locale
 * sans passer par le contexte `LocaleProvider`.
 */
export function resolveUiLocale(): Locale {
	return getPreferredLocale() ?? detectBrowserLocale();
}
