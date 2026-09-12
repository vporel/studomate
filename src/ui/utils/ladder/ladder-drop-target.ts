import { PositionedLeaf } from "./ladder-flow-builder";

export type DropTarget = { row: number; col: number; sourceId: string | null };

/**
 * Résout la cible d'un dépôt (drag & drop d'un contact/bobine) à partir de sa cellule de grille
 * déjà accrochée par l'appelant : l'élément le plus proche à gauche sur la même ligne devient la
 * source d'une connexion automatique vers le nouvel élément ; `null` s'il n'y en a aucun (voir
 * `useLadderDropHandlers` pour ce que ce cas déclenche selon la colonne). L'insertion au milieu
 * d'une connexion existante (même ligne ou pas) est traitée séparément, en amont, par
 * `findCellCrossings` — ceci ne gère que le repli "rien ne croise cette cellule".
 */
export function resolveDropTarget(
	leaves: PositionedLeaf[],
	dropRow: number,
	dropCol: number,
): DropTarget {
	const before = leaves.filter(
		(leaf) => leaf.row === dropRow && leaf.col < dropCol,
	);
	const source =
		before.length > 0
			? before.reduce((closest, leaf) =>
					leaf.col > closest.col ? leaf : closest,
				)
			: null;

	return { row: dropRow, col: dropCol, sourceId: source ? source.id : null };
}
