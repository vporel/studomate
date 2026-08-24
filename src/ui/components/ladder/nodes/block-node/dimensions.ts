import { GRID_CELL_HEIGHT, GRID_CELL_WIDTH } from "@/ui/utils/ladder/ladder-flow-builder";

/** Un bloc occupe 2 cellules de grille horizontalement (contre 1 pour un contact/une bobine) —
 * voir `getElementWidth`. La hauteur par défaut suppose une seule ligne de pins (structurelle) ;
 * un bloc avec des lignes de paramètres en occupe plus (voir `getBlockHeightInCellUnits`/
 * `getElementHeight`). */
export const BLOCK_NODE_DIMENSIONS = { width: GRID_CELL_WIDTH * 2, height: GRID_CELL_HEIGHT };

/** Hauteur d'une ligne de pins affichée — chaque ligne suivante ne décale son point de départ
 * (`top`) que d'un demi-`GRID_CELL_HEIGHT`, jamais d'une cellule pleine (voir
 * `getBlockHeightInCellUnits`). */
export const PIN_ROW_HEIGHT = 32;
