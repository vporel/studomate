import {
	HmiWidgetData,
	HmiWidgetSize,
	HmiWidgetType,
} from "@/schemas/hmi/hmi-widget.schema";

export const SNAP_GRID = 10; // px — grille magnétique

/** Décalage appliqué au `stackOrder` d'un widget (voir `HmiWidgetBase.stackOrder`) pour obtenir
 * son `z-index` CSS de rendu — réserve la plage 0-99 à des éléments du canvas qui ne sont pas
 * des widgets mais doivent rester en dessous (ex. grille, sélection). Purement un détail
 * d'affichage : ne touche jamais la valeur persistée. */
export const HMI_WIDGET_ZINDEX_OFFSET = 100;

export const ZOOM_MIN = 0.8;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.1;
export const ZOOM_DEFAULT = 1;

/** Un outil de la palette — dans le cas général un par `HmiWidgetType`, mais plusieurs outils
 * peuvent partager le même type avec une taille de départ différente (ex. "Ellipse"/"Cercle" :
 * même widget `ellipse`, juste une forme initiale carrée pour "Cercle" — l'utilisateur redimensionne
 * ensuite librement, voir `HmiWidget.create`). */
export interface HmiWidgetTool {
	type: HmiWidgetType;
	/** Remplace le libellé de `HMI_WIDGET_DEFINITIONS[type]` — nécessaire quand plusieurs outils
	 * partagent le même type. */
	label?: string;
	sizeOverride?: HmiWidgetSize;
	/** Complète les données par défaut du type — voir `HmiWidget.create`. */
	dataOverride?: Partial<HmiWidgetData>;
	/** Largeur d'aperçu dans la palette — remplace celle par défaut du type (voir
	 * `HmiWidgetToolbarItem`), utile pour distinguer visuellement deux outils du même type. */
	previewWidth?: number;
}

export function snapToGrid(value: number): number {
	return Math.round(value / SNAP_GRID) * SNAP_GRID;
}

export function clampZoom(z: number): number {
	return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}
