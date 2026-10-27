import { detectBrowserLocale, isLocale, type Locale } from "@/i18n/config";
import { readString, writeString } from "./safe-local-storage";
import { StorageLocation } from "./repositories/project.repository";
import { Dialect } from "@/expression-language/dialect.enum";

const STORAGE_KEY = "studomate_preferred_save_location";
const LOCALE_STORAGE_KEY = "studomate_locale";
const DEFAULT_DIALECT_KEY = "studomate_default_dialect";
const AUTO_OPEN_HMI_SIMULATION_KEY = "studomate_auto_open_hmi_simulation";
const PRODUCT_TOUR_SEEN_KEY = "studomate_product_tour_seen";
const PROJECT_EVER_SAVED_KEY = "studomate_project_ever_saved";

/**
 * Lieu de stockage par défaut choisi par l'utilisateur (page Préférences, ou premier
 * enregistrement d'un projet neuf). `null` tant qu'aucun choix n'a jamais été fait — c'est ce qui
 * déclenche la modale de choix au tout premier enregistrement.
 */
export function getPreferredSaveLocation(): StorageLocation | null {
	const raw = readString(STORAGE_KEY);
	return raw === "local" || raw === "cloud" ? raw : null;
}

export function setPreferredSaveLocation(location: StorageLocation): void {
	writeString(STORAGE_KEY, location);
}

/**
 * Langue de l'interface choisie par l'utilisateur. `null` tant qu'aucun choix explicite n'a
 * été fait — l'appelant retombe alors sur la langue du navigateur.
 */
export function getPreferredLocale(): Locale | null {
	const raw = readString(LOCALE_STORAGE_KEY);
	return isLocale(raw) ? raw : null;
}

export function setPreferredLocale(locale: Locale): void {
	writeString(LOCALE_STORAGE_KEY, locale);
}

/**
 * Dialecte des expressions appliqué aux nouveaux projets vierges. `null` tant qu'aucun choix
 * n'a été fait, ce qui déclenche la popup de préférences à la première création.
 */
export function getDefaultDialect(): Dialect | null {
	const raw = readString(DEFAULT_DIALECT_KEY);
	return raw === Dialect.FR || raw === Dialect.EN ? raw : null;
}

export function setDefaultDialect(dialect: Dialect): void {
	writeString(DEFAULT_DIALECT_KEY, dialect);
}

/**
 * Bascule automatiquement sur l'onglet "Simulation HMI" à l'entrée en simulation quand le
 * projet a au moins une page HMI. `true` par défaut (comportement historique) tant que
 * l'utilisateur n'a rien désactivé dans les Préférences.
 */
export function getAutoOpenHmiSimulationOnStart(): boolean {
	return readString(AUTO_OPEN_HMI_SIMULATION_KEY) !== "false";
}

export function setAutoOpenHmiSimulationOnStart(value: boolean): void {
	writeString(AUTO_OPEN_HMI_SIMULATION_KEY, String(value));
}

/** Whether the guided tour was already shown in this browser. */
export function getProductTourSeen(): boolean {
	return readString(PRODUCT_TOUR_SEEN_KEY) === "true";
}

export function setProductTourSeen(): void {
	writeString(PRODUCT_TOUR_SEEN_KEY, "true");
}

/**
 * Whether a project was ever saved from this browser. Never cleared, even when every project is
 * deleted afterwards.
 */
export function getProjectEverSaved(): boolean {
	return readString(PROJECT_EVER_SAVED_KEY) === "true";
}

export function setProjectEverSaved(): void {
	writeString(PROJECT_EVER_SAVED_KEY, "true");
}

/**
 * Langue effective de l'interface : le choix explicite de l'utilisateur, sinon la langue du
 * navigateur. Pour le code hors React (managers zustand, mappers) qui a besoin de la locale
 * sans passer par le contexte `LocaleProvider`.
 */
export function resolveUiLocale(): Locale {
	return getPreferredLocale() ?? detectBrowserLocale();
}
