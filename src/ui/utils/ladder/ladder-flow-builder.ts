import { getElementHeight } from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import { LadderNodeType } from "@/ui/components/ladder/flow/ladder-nodes-definitions";
import { Edge } from "@xyflow/react";

/** Taille d'une cellule de la grille de snap (unité de base de tout le layout ladder). */
export const GRID_CELL_WIDTH = 60;
export const GRID_CELL_HEIGHT = 45;

/** Largeur d'une colonne d'éléments (contact/coil) = 1 cellule. */
export const LADDER_FLOW_COL_WIDTH = GRID_CELL_WIDTH; // 60px
/** Hauteur d'une ligne de réseau = 1 cellule. */
export const LADDER_FLOW_ROW_HEIGHT = GRID_CELL_HEIGHT; // 45px

/** Décalage vertical de la ligne 0 par rapport à l'origine du monde React Flow. Sans lui, la
 * ligne 0 est exactement à y=0 et l'étiquette au-dessus de son contact/bobine (`top: -10px`,
 * voir `ContactNode`/`CoilNode`) sort du wrapper `.react-flow`, dont l'`overflow: hidden`
 * (posé en inline style par la librairie, pas surchargeable en CSS) la coupe alors. Une demi-
 * cellule suffit à loger l'étiquette sans laisser une ligne entière de vide ; n'étant plus un
 * multiple exact de la taille de cellule, le fond en pointillés doit être explicitement recalé
 * sur cette valeur (`backgroundPosition`, voir `LadderSection`) au lieu de compter sur la
 * périodicité du motif. */
export const LADDER_FLOW_TOP_OFFSET = GRID_CELL_HEIGHT / 2;

/** Nombre maximum de colonnes du ladder. */
export const LADDER_MAX_COLS = 18;

/** Largeur de la lane du rail d'alimentation — un simple stub visuel, pas une colonne
 * d'éléments. */
export const RAIL_LANE_WIDTH = 10;
/** Abscisse où commence la colonne 0 des éléments (contact/coil). */
export const POWER_RAIL_OFFSET = RAIL_LANE_WIDTH;

/**
 * Hauteur (en cellules de grille, voir `getElementHeight`) de chaque ligne occupée d'une section
 * — le maximum parmi ses éléments, pour qu'une ligne contenant un bloc tempo (2 cellules) pousse
 * toutes les lignes suivantes d'autant, sans affecter les autres éléments de cette même ligne
 * (positionnés en haut de l'espace ainsi agrandi). Une ligne absente de la map (aucun élément, ou
 * au-delà du contenu actuel) vaut 1 cellule — voir `rowToY`/`yToRow`.
 */
export function computeRowHeightsInCells(
	section: Section,
): Map<number, number> {
	const heights = new Map<number, number>();
	for (const element of section.elements) {
		const row = element.position.row;
		heights.set(
			row,
			Math.max(heights.get(row) ?? 1, getElementHeight(element)),
		);
	}
	return heights;
}

/**
 * Conversions ligne/colonne (grille logique) ↔ pixels (monde React Flow) — seul point de
 * vérité pour `LADDER_FLOW_TOP_OFFSET`/`POWER_RAIL_OFFSET` : tout site qui construit ou lit
 * une position doit passer par ces fonctions plutôt que refaire le calcul, pour qu'un futur
 * changement de l'un ou l'autre décalage n'ait qu'un seul endroit à corriger. L'arrondi
 * (`Math.round`/`Math.floor` selon le site : accrochage au plus proche vs dépôt dans la
 * cellule survolée) reste au call site, ces fonctions ne font que le décalage/l'échelle.
 *
 * `rowHeightsInCells` (voir `computeRowHeightsInCells`) rend la hauteur de ligne non uniforme :
 * omis (grille uniforme), toute ligne vaut 1 cellule.
 */
export function rowToY(
	row: number,
	rowHeightsInCells: Map<number, number> = new Map(),
): number {
	let y = LADDER_FLOW_TOP_OFFSET;
	for (let r = 0; r < row; r++) {
		y += (rowHeightsInCells.get(r) ?? 1) * LADDER_FLOW_ROW_HEIGHT;
	}
	return y;
}
export function yToRow(
	y: number,
	rowHeightsInCells: Map<number, number> = new Map(),
): number {
	let cumulativeY = LADDER_FLOW_TOP_OFFSET;
	let row = 0;
	// Borne défensive : une position hors de tout contenu raisonnable (souris hors du canevas)
	// ne doit pas boucler indéfiniment.
	while (row < 100_000) {
		const rowHeightPx =
			(rowHeightsInCells.get(row) ?? 1) * LADDER_FLOW_ROW_HEIGHT;
		if (y < cumulativeY + rowHeightPx)
			return row + (y - cumulativeY) / rowHeightPx;
		cumulativeY += rowHeightPx;
		row++;
	}
	return row;
}
export function colToX(col: number): number {
	return POWER_RAIL_OFFSET + col * LADDER_FLOW_COL_WIDTH;
}
export function xToCol(x: number): number {
	return (x - POWER_RAIL_OFFSET) / LADDER_FLOW_COL_WIDTH;
}

/** Type d'edge des connexions du Ladder — voir `LadderConnectionEdge`. */
export const LADDER_CONNECTION_EDGE_TYPE = "ladder-connection";

/**
 * Sommets (pixels) d'un tracé sans coude explicite — coude à mi-chemin entre source et cible.
 * Équivalent Ladder de `getConnectionLinePoints` (`grafcet-utils.ts`) : partagé entre
 * `LadderConnectionEdge` (repli quand `points` n'est pas encore matérialisé) et
 * `LadderConnectionLine` (aperçu pendant le tracé manuel d'une connexion, qui n'a jamais de
 * `points`), pour que les deux rendus se ressemblent.
 */
export function getConnectionLinePoints(
	fromX: number,
	fromY: number,
	toX: number,
	toY: number,
): [number, number][] {
	if (fromY === toY)
		return [
			[fromX, fromY],
			[toX, toY],
		];
	const midX = (fromX + toX) / 2;
	return [
		[fromX, fromY],
		[midX, fromY],
		[midX, toY],
		[toX, toY],
	];
}

const VIRTUAL_RAIL_ID_PREFIX = "virtual-rail-";

/** Id d'un nœud de borne d'alimentation virtuelle (non persistée) pour la ligne `row`. */
export function virtualRailId(row: number): string {
	return `${VIRTUAL_RAIL_ID_PREFIX}${row}`;
}

/**
 * Extrait la ligne d'un id de borne d'alimentation virtuelle, ou `null` si `id` n'en est pas un
 * (élément réel du schéma) — utilisé pour matérialiser une vraie `RailTerminalElement` quand
 * l'utilisateur trace manuellement une connexion depuis une ligne qui n'en a pas encore.
 */
export function parseVirtualRailRow(id: string): number | null {
	if (!id.startsWith(VIRTUAL_RAIL_ID_PREFIX)) return null;
	const row = Number(id.slice(VIRTUAL_RAIL_ID_PREFIX.length));
	return Number.isInteger(row) ? row : null;
}

/** Position en grille logique (ligne/colonne) d'un élément de la section. */
export type PositionedLeaf = { id: string; row: number; col: number };

/**
 * Dérivés purs de `section.elements`, indépendants de tout état de vue (sélection, glisser en
 * cours) — utilisés pour la résolution de dépôt/glisser et le dimensionnement du canevas, jamais
 * pour construire les `nodes`/`edges` React Flow eux-mêmes (voir `buildTargetNodes` plus bas et
 * `LadderNodesFactory`/`LadderEdgesFactory`, qui préservent l'identité/l'état de vue entre deux
 * synchronisations — contrairement à ces fonctions, rappelées à chaque rendu).
 */
export function computeSectionLayout(section: Section): {
	totalRows: number;
	maxCol: number;
	leafPositions: PositionedLeaf[];
	rowHeightsInCells: Map<number, number>;
} {
	const leafPositions: PositionedLeaf[] = section.elements.map((element) => ({
		id: element.id,
		row: element.position.row,
		col: element.position.col,
	}));
	const totalRows = Math.max(
		1,
		...section.elements.map((element) => element.position.row + 1),
	);
	const maxCol = section.elements.reduce(
		(max, element) => Math.max(max, element.position.col),
		0,
	);
	return {
		totalRows,
		maxCol,
		leafPositions,
		rowHeightsInCells: computeRowHeightsInCells(section),
	};
}

/**
 * Nœuds React Flow "cibles" d'une section : chaque élément porte sa propre position de grille
 * (`row`/`col`), un simple mapping direct, sans layout à recalculer — la position affichée est
 * donc toujours exactement celle où l'élément a été déposé. Pas d'état de vue ici (`selected`,
 * `dragging`...) : c'est la donnée que `LadderNodesFactory.syncNodes` réconcilie avec les nœuds
 * précédents, jamais ce qu'on passe directement à `<ReactFlow>`.
 */
export function buildTargetNodes(section: Section): LadderNodeType[] {
	const rowHeightsInCells = computeRowHeightsInCells(section);
	const nodes: LadderNodeType[] = section.elements.map((element) => {
		if (element.type === "railTerminal") {
			return {
				id: element.id,
				type: "railTerminal",
				// Toujours à l'extrême gauche (largeur RAIL_LANE_WIDTH) : ce n'est pas une colonne
				// d'éléments, `element.position.col` (RAIL_TERMINAL_COL) n'est qu'un marqueur
				// logique d'ordre, jamais traduit en pixels — cohérent avec `draggable: false`.
				position: { x: 0, y: rowToY(element.position.row, rowHeightsInCells) },
				data: { virtual: false },
				selectable: false,
				draggable: false,
			} as LadderNodeType;
		}
		if (element.type === "block") {
			return {
				id: element.id,
				type: "block",
				position: {
					x: colToX(element.position.col),
					y: rowToY(element.position.row, rowHeightsInCells),
				},
				data: element.data,
			} as LadderNodeType;
		}
		return {
			id: element.id,
			type: element.type,
			position: {
				x: colToX(element.position.col),
				y: rowToY(element.position.row, rowHeightsInCells),
			},
			data: { variable: element.data.variable, type: element.data.type },
		} as LadderNodeType;
	});

	// Affordance visuelle : une borne d'alimentation virtuelle (non persistée) sur chaque ligne
	// qui n'en a pas encore de réelle, pour que le rail semble toujours présent sur tout le flow.
	const { totalRows } = computeSectionLayout(section);
	const rowsWithRealRailTerminal = new Set(
		section.elements
			.filter((element) => element.type === "railTerminal")
			.map((element) => element.position.row),
	);
	for (let row = 0; row < totalRows; row++) {
		if (rowsWithRealRailTerminal.has(row)) continue;
		nodes.push({
			id: virtualRailId(row),
			type: "railTerminal",
			position: { x: 0, y: rowToY(row, rowHeightsInCells) },
			data: { virtual: true },
			selectable: false,
			draggable: false,
		} as LadderNodeType);
	}

	return nodes;
}

/** Arêtes React Flow "cibles" d'une section — voir `buildTargetNodes`. */
export function buildTargetEdges(section: Section): Edge[] {
	return section.connections.map((connection) => ({
		id: connection.id,
		source: connection.source.id,
		sourceHandle: connection.source.handle,
		target: connection.target.id,
		targetHandle: connection.target.handle,
		type: LADDER_CONNECTION_EDGE_TYPE,
		// `points` (le tracé, en demi-unités de grille) : voir `LadderConnectionEdge`.
		data: { points: connection.data.points },
	}));
}
