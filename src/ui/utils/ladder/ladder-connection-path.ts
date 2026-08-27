import Connection from "@/schemas/ladder/connection.schema";
import { getElementWidth, GridPosition } from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";

/**
 * Unité quart-de-cellule : 1 = un quart de colonne ou un quart de ligne (résolution du
 * déplacement d'un coude, souris comme clavier — voir `LadderConnectionEdge` et
 * `useLadderConnectionKeyboardHandler`). Une colonne `C` a son bord gauche à `4C`, son bord droit
 * à `4C+4`, son centre (hauteur des poignées gauche/droite d'un élément) à `4C+2` — même principe
 * pour les lignes. Permet d'exprimer un coude sans dépendre du pixel : la borne d'alimentation
 * (colonne `RAIL_TERMINAL_COL = -1`) tombe déjà pile sur `colRightEdge(-1) = 0`, qui coïncide avec
 * le bord gauche de la colonne 0 (`POWER_RAIL_OFFSET` égale `RAIL_LANE_WIDTH` par construction) —
 * aucun cas particulier à coder pour elle.
 */
export const CELL_SUBDIVISIONS = 4;
const rowCenter = (row: number) =>
	row * CELL_SUBDIVISIONS + CELL_SUBDIVISIONS / 2;
const colLeftEdge = (col: number) => col * CELL_SUBDIVISIONS;
const colRightEdge = (col: number) =>
	col * CELL_SUBDIVISIONS + CELL_SUBDIVISIONS;

export type PathSegment =
	| {
			orientation: "horizontal";
			quarterRow: number;
			quarterColA: number;
			quarterColB: number;
	  }
	| {
			orientation: "vertical";
			quarterCol: number;
			quarterRowA: number;
			quarterRowB: number;
	  };

/**
 * Coude par défaut d'une connexion, calculé **une seule fois** — à la création (voir les
 * commandes/handlers qui construisent une `Connection`), ou la première fois que ses deux
 * lignes divergent si elle a été créée sur une même ligne (`points` alors vide). Passé ce
 * moment, `points` est explicite et suit les règles de déplacement (mur, mémoire au moment où
 * les lignes reconvergent) plutôt que d'être recalculé — cette fonction ne sert donc plus
 * qu'ici et comme filet de sécurité dans `computeConnectionSegments`.
 *
 * Toujours à la sortie de la source : ce choix donne le bon nombre de segments dans tous les
 * cas (0 si même ligne, sinon exactement 2, même quand source et cible partagent nominalement
 * la même colonne — leurs poignées ne coïncident jamais, la sortie étant au bord droit et
 * l'entrée au bord gauche).
 */
export function initialConnectionPoints(
	source: GridPosition,
	target: GridPosition,
	sourceWidth: number = 1,
): [number, number][] {
	if (source.row === target.row) return [];
	const bendQuarterCol = colRightEdge(source.col + sourceWidth - 1);
	return [
		[rowCenter(source.row), bendQuarterCol],
		[rowCenter(target.row), bendQuarterCol],
	];
}

/**
 * Calcule le tracé "poussé" par le déplacement du nœud `movedSide` aux nouvelles positions
 * `source`/`target` — jamais recalculé depuis zéro (voir `initialConnectionPoints`, réservé à la
 * création). Seul le coude du côté qui a bougé peut être poussé (vers la droite pour la source,
 * vers la gauche pour la cible, si ce nœud le rattrape) ; l'autre coude n'est jamais touché sauf
 * si la poussée le dépasse, auquel cas les deux fusionnent — c'est le seul cas où le déplacement
 * d'un nœud modifie le coude "de l'autre bout" de SA PROPRE connexion (jamais une connexion tierce).
 * Un déplacement qui s'éloigne du coude laisse le point intact (le stub s'allonge).
 */
export function pushConnectionBend(
	points: [number, number][],
	movedSide: "source" | "target",
	source: GridPosition,
	target: GridPosition,
	sourceWidth: number = 1,
): [number, number][] {
	if (points.length === 0 || source.row === target.row) return points;
	let colA = points[0][1];
	let colB = points[1][1];
	const wasSingleBend = colA === colB;

	if (movedSide === "source") {
		const sourceExitCol = colRightEdge(source.col + sourceWidth - 1);
		if (sourceExitCol > colA) {
			colA = sourceExitCol;
			if (wasSingleBend || colA > colB) colB = colA;
		}
	} else {
		const targetEntryCol = colLeftEdge(target.col);
		if (targetEntryCol < colB) {
			colB = targetEntryCol;
			if (wasSingleBend || colB < colA) colA = colB;
		}
	}

	return [
		[rowCenter(source.row), colA],
		[rowCenter(target.row), colB],
	];
}

/**
 * Découpe `[source, ...points, target]` en segments horizontaux/verticaux alternés. `points` ne
 * contient jamais la source/la cible elles-mêmes (toujours recalculées depuis la position
 * courante des éléments, jamais stockées) — voir `initialConnectionPoints` pour comment ils sont
 * matérialisés la première fois. Sur une même ligne, `points` est ignoré plutôt qu'effacé : la
 * ligne droite s'affiche, mais un coude mémorisé (d'avant que les lignes convergent) reste prêt
 * à resservir dès qu'elles redivergent.
 *
 * La *ligne* de chaque point stocké n'a pas de valeur propre : seule sa *colonne* est une donnée
 * libre (la position d'un coude déplacé). La ligne est toujours réécrite ici depuis la position
 * actuelle de la source (premier point) ou de la cible (dernier) — sinon un simple changement de
 * ligne d'un élément (sans toucher au coude) rendrait le point stocké obsolète et casserait le
 * tracé (segment ni horizontal ni vertical).
 */
export function computeConnectionSegments(
	source: GridPosition,
	target: GridPosition,
	points: [number, number][] = [],
	sourceWidth: number = 1,
): PathSegment[] {
	const sameRow = source.row === target.row;
	const rawBendPoints = sameRow
		? []
		: points.length > 0
			? points
			: initialConnectionPoints(source, target, sourceWidth);
	// Un seul coude géré pour l'instant (voir le commentaire de la fonction) : toujours 0 ou 2
	// points, respectivement adjacents à la source et à la cible.
	const bendPoints: [number, number][] = rawBendPoints.map(
		([, quarterCol], i) => [
			i === 0 ? rowCenter(source.row) : rowCenter(target.row),
			quarterCol,
		],
	);
	const vertices: [number, number][] = [
		[rowCenter(source.row), colRightEdge(source.col + sourceWidth - 1)],
		...bendPoints,
		[rowCenter(target.row), colLeftEdge(target.col)],
	];

	const segments: PathSegment[] = [];
	for (let i = 0; i < vertices.length - 1; i++) {
		const [rowA, colA] = vertices[i];
		const [rowB, colB] = vertices[i + 1];
		if (rowA === rowB && colA === colB) continue; // segment nul (coude confondu avec un bout)
		if (rowA === rowB)
			segments.push({
				orientation: "horizontal",
				quarterRow: rowA,
				quarterColA: colA,
				quarterColB: colB,
			});
		else
			segments.push({
				orientation: "vertical",
				quarterCol: colA,
				quarterRowA: rowA,
				quarterRowB: rowB,
			});
	}
	return segments;
}

function between(value: number, a: number, b: number): boolean {
	return value >= Math.min(a, b) && value <= Math.max(a, b);
}

/**
 * Comment le tracé d'une connexion touche une cellule vide (row, col) :
 * - "through" : un segment horizontal traverse la cellule sur toute sa largeur — dépose = split
 *   (la connexion existante est coupée au profit de deux nouvelles, une de chaque côté).
 * - "left"/"right" : un segment vertical longe la cellule (elle est vide, il ne fait que passer
 *   à côté) — dépose = branchement parallèle, pas de split (la connexion existante reste
 *   intacte). Une frontière de cellule peut porter les deux — une même colonne est à la fois le
 *   bord droit d'une cellule et le bord gauche de la suivante.
 */
export type CellTouch = "through" | "left" | "right" | null;

export function classifyCellTouch(
	segments: PathSegment[],
	row: number,
	col: number,
): CellTouch {
	const cellRowCenter = rowCenter(row);
	const cellLeft = colLeftEdge(col);
	const cellRight = colRightEdge(col);
	for (const segment of segments) {
		if (segment.orientation === "horizontal") {
			if (segment.quarterRow !== cellRowCenter) continue;
			if (
				between(cellLeft, segment.quarterColA, segment.quarterColB) &&
				between(cellRight, segment.quarterColA, segment.quarterColB)
			) {
				return "through";
			}
		} else {
			if (!between(cellRowCenter, segment.quarterRowA, segment.quarterRowB))
				continue;
			if (segment.quarterCol === cellLeft) return "left";
			if (segment.quarterCol === cellRight) return "right";
		}
	}
	return null;
}

/** Les connexions dont le tracé touche une cellule vide donnée, par type de contact — voir
 * `CellTouch`. Une seule connexion retenue par type (le premier match), un chevauchement de
 * plusieurs connexions sur la même frontière n'est pas géré ici. */
export type CellCrossings = {
	through?: Connection;
	left?: Connection;
	right?: Connection;
};

export function findCellCrossings(
	section: Section,
	row: number,
	col: number,
): CellCrossings {
	const crossings: CellCrossings = {};
	for (const connection of section.connections) {
		const source = section.getElement(connection.source.id);
		const target = section.getElement(connection.target.id);
		if (!source || !target) continue;
		const touch = classifyCellTouch(
			computeConnectionSegments(
				source.position,
				target.position,
				connection.data.points,
				getElementWidth(source),
			),
			row,
			col,
		);
		if (touch === "through" && !crossings.through)
			crossings.through = connection;
		if (touch === "left" && !crossings.left) crossings.left = connection;
		if (touch === "right" && !crossings.right) crossings.right = connection;
	}
	return crossings;
}
