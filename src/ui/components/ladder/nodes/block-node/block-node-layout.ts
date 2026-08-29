import {
	BlockPortSpec,
	getBlockPinRowCount,
} from "@/schemas/ladder/block-port.schema";

/**
 * Hauteur de rendu du nœud, en unités de cellule de grille — la première ligne de pins occupe
 * une cellule pleine, chaque ligne suivante ne décale son point de départ que d'un demi-cellule :
 * `1 + (lignes de pins - 1) * 0.5`. Valeur fractionnaire, multipliée par `GRID_CELL_HEIGHT` pour
 * le CSS du nœud — la grille, elle, réserve l'entier supérieur (voir `getBlockHeightInCells`).
 */
export function getBlockHeightInCellUnits(portSpecs: BlockPortSpec[]): number {
	return 1 + (getBlockPinRowCount(portSpecs) - 1) * 0.5;
}

/** Une ligne de pins paramètres affichable — une entrée à gauche, une sortie à droite, l'une des
 * deux pouvant être absente (voir `getParameterPinRows`). */
export type ParameterPinRow = { input?: BlockPortSpec; output?: BlockPortSpec };

/**
 * Regroupe les ports `kind: "parameter"` en lignes affichables : la n-ième entrée paramètre
 * partage sa ligne avec la n-ième sortie paramètre (PT/ET d'un timer, par exemple, forment une
 * seule ligne). Même comptage de lignes que `getBlockPinRowCount` — jamais de rendu codé en dur
 * par famille dans `BlockNode`.
 */
export function getParameterPinRows(
	portSpecs: BlockPortSpec[],
): ParameterPinRow[] {
	const inputs = portSpecs.filter(
		(spec) => spec.kind === "parameter" && spec.direction === "input",
	);
	const outputs = portSpecs.filter(
		(spec) => spec.kind === "parameter" && spec.direction === "output",
	);
	const rowCount = Math.max(inputs.length, outputs.length);
	return Array.from({ length: rowCount }, (_, i) => ({
		input: inputs[i],
		output: outputs[i],
	}));
}
