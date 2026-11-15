import { detectBrowserLocale, isLocale, type Locale } from "@/i18n/config";
import {
	readJson,
	readKnownString,
	readString,
	writeJson,
	writeString,
} from "./safe-local-storage";
import { StorageLocation } from "./repositories/project.repository";
import { Dialect } from "@/expression-language/dialect.enum";

const STORAGE_KEY = "studomate_preferred_save_location";
const LOCALE_STORAGE_KEY = "studomate_locale";
const DEFAULT_DIALECT_KEY = "studomate_default_dialect";
const AUTO_OPEN_HMI_SIMULATION_KEY = "studomate_auto_open_hmi_simulation";
const PRODUCT_TOUR_SEEN_KEY = "studomate_product_tour_seen";
const PROJECT_EVER_SAVED_KEY = "studomate_project_ever_saved";
const SIMULATION_MODE_KEY = "studomate_simulation_mode";
const SCENE3D_DISPLAY_MODE_KEY = "studomate_scene3d_display_mode";
const SCENE3D_FLOATING_FRAME_KEY = "studomate_scene3d_floating_frame";
const SIDE_PANEL_WIDTH_KEY = "studomate_side_panel_width";
const SIDE_PANEL_SCENE_SHARE_KEY = "studomate_side_panel_scene_share";

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

/** Simulation mode last chosen, `null` until then or when it is not one of `knownModes`. */
export function getStoredSimulationMode<T extends string>(
	knownModes: readonly T[],
): T | null {
	return readKnownString(SIMULATION_MODE_KEY, knownModes);
}

export function setStoredSimulationMode(mode: string): void {
	writeString(SIMULATION_MODE_KEY, mode);
}

/** Display mode of the 3D scene last chosen, `null` until then or when it is not one of `knownModes`. */
export function getStoredScene3dDisplayMode<T extends string>(
	knownModes: readonly T[],
): T | null {
	return readKnownString(SCENE3D_DISPLAY_MODE_KEY, knownModes);
}

export function setStoredScene3dDisplayMode(mode: string): void {
	writeString(SCENE3D_DISPLAY_MODE_KEY, mode);
}

export type EditorTourKind = "grafcet" | "ladder" | "hmi";

function editorTourSeenKey(kind: EditorTourKind): string {
	return `studomate_editor_tour_${kind}_seen`;
}

/** Whether the tour of this editor was already shown in this browser. */
export function getEditorTourSeen(kind: EditorTourKind): boolean {
	return readString(editorTourSeenKey(kind)) === "true";
}

export function setEditorTourSeen(kind: EditorTourKind): void {
	writeString(editorTourSeenKey(kind), "true");
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

/** Position and size, in pixels, of the floating 3D scene inside the editors area. */
export type Scene3dFloatingFrame = {
	x: number;
	y: number;
	width: number;
	height: number;
};

/** `null` when the frame was never placed or its stored value is not usable. */
export function getScene3dFloatingFrame(): Scene3dFloatingFrame | null {
	const stored = readJson(SCENE3D_FLOATING_FRAME_KEY);
	if (typeof stored !== "object" || stored === null) return null;
	const { x, y, width, height } = stored as Record<string, unknown>;
	return [x, y, width, height].every(
		(value) => typeof value === "number" && Number.isFinite(value),
	)
		? (stored as Scene3dFloatingFrame)
		: null;
}

export function setScene3dFloatingFrame(frame: Scene3dFloatingFrame): void {
	writeJson(SCENE3D_FLOATING_FRAME_KEY, frame);
}

function readPositiveNumber(key: string): number | null {
	const stored = Number(readString(key));
	return Number.isFinite(stored) && stored > 0 ? stored : null;
}

/** Width, in pixels, of the side panel on the right of the editors (3D scene, watch tables). `null` until it was resized. */
export function getSidePanelWidth(): number | null {
	return readPositiveNumber(SIDE_PANEL_WIDTH_KEY);
}

export function setSidePanelWidth(width: number): void {
	writeString(SIDE_PANEL_WIDTH_KEY, String(Math.round(width)));
}

/**
 * Share of the side panel height, in percent, taken by the 3D scene when the watch tables are shown
 * under it. `null` until it was resized, or when the stored value is not a share.
 */
export function getSidePanelSceneShare(): number | null {
	const share = readPositiveNumber(SIDE_PANEL_SCENE_SHARE_KEY);
	return share !== null && share < 100 ? share : null;
}

export function setSidePanelSceneShare(percent: number): void {
	writeString(SIDE_PANEL_SCENE_SHARE_KEY, String(percent));
}
