import { computeLadderFlowDimensions } from "./ladder-flow-dimensions";
import {
	colToX,
	GRID_CELL_HEIGHT,
	LADDER_MAX_COLS,
	rowToY,
} from "./ladder-flow-builder";

const snap = (n: number) => Math.ceil(n / GRID_CELL_HEIGHT) * GRID_CELL_HEIGHT;

describe("computeLadderFlowDimensions", () => {
	it("largeur = toutes les colonnes de la grille", () => {
		expect(computeLadderFlowDimensions(1).width).toBe(colToX(LADDER_MAX_COLS));
	});

	it("ajoute une seule ligne vide sous le dernier réseau", () => {
		expect(computeLadderFlowDimensions(10).height).toBe(snap(rowToY(11)));
	});

	it("respecte la hauteur minimale de 3 lignes", () => {
		expect(computeLadderFlowDimensions(1).height).toBe(snap(rowToY(3)));
	});

	it("arrondit au multiple supérieur d'une cellule", () => {
		expect(computeLadderFlowDimensions(10).height % GRID_CELL_HEIGHT).toBe(0);
	});
});
