import { GRID_CELL_HEIGHT, GRID_CELL_WIDTH, LADDER_FLOW_ROW_HEIGHT, LADDER_MAX_COLS, POWER_RAIL_OFFSET } from "./ladder-flow-builder";

/** Hauteur minimale : assez pour 3 lignes (1 réseau + marge). */
const MIN_ROWS = 3;

const snapToMultiple = (n: number, step: number) => Math.ceil(n / step) * step;

export function computeLadderFlowDimensions(totalRows: number): { width: number; height: number } {
	const width = LADDER_MAX_COLS * GRID_CELL_WIDTH + POWER_RAIL_OFFSET;
	const rawHeight = Math.max(MIN_ROWS, totalRows + 2) * LADDER_FLOW_ROW_HEIGHT;
	return {
		width,
		height: snapToMultiple(rawHeight, GRID_CELL_HEIGHT),
	};
}
