import {
	colToX,
	GRID_CELL_HEIGHT,
	LADDER_MAX_COLS,
	rowToY,
} from "./ladder-flow-builder";

/** Hauteur minimale : assez pour 3 lignes (1 réseau + marge). */
const MIN_ROWS = 3;

/** Lignes vides ajoutées sous le dernier réseau — place pour déposer un élément ou tracer une
 * connexion en bas de la section. */
const TRAILING_EMPTY_ROWS = 1;

const snapToMultiple = (n: number, step: number) => Math.ceil(n / step) * step;

export function computeLadderFlowDimensions(totalRows: number): {
	width: number;
	height: number;
} {
	const width = colToX(LADDER_MAX_COLS);
	const rawHeight = rowToY(Math.max(MIN_ROWS, totalRows + TRAILING_EMPTY_ROWS));
	return {
		width,
		height: snapToMultiple(rawHeight, GRID_CELL_HEIGHT),
	};
}
