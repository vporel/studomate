import { deepObjectsComparison } from "@/lib/object";
import {
	getElementHeight,
	getElementWidth,
	GridPosition,
	LadderElement,
} from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import { LadderNodeType } from "@/ui/components/ladder/flow/ladder-nodes-definitions";
import {
	cellRectsOverlap,
	colToX,
	computeSectionLayout,
	elementFootprint,
	LADDER_MAX_COLS,
	parseVirtualRailRow,
	rowToY,
	xToCol,
	yToRow,
} from "@/ui/utils/ladder/ladder-flow-builder";
import {
	findCellCrossings,
	initialConnectionPoints,
	pushConnectionBend,
} from "@/ui/utils/ladder/ladder-connection-path";
import { NodeChange, NodePositionChange } from "@xyflow/react";

export type BendUpdate = {
	connectionId: string;
	newPoints: [number, number][];
	previousPoints: [number, number][];
};

/** Accroche chaque frame (pas seulement la dernière) à la grille de colonnes/lignes réelle —
 * `<ReactFlow snapGrid>` ne peut pas le faire lui-même : il n'accroche qu'à des multiples
 * bruts de sa valeur depuis l'origine, alors que les colonnes réelles sont décalées de
 * `POWER_RAIL_OFFSET`. Sans ce recalage, le nœud suit un pas plus fin que la colonne pendant
 * le geste (`RAIL_LANE_WIDTH`) et corrige brusquement en fin de geste vers la colonne la plus
 * proche (calculée dans `buildPositionCommand`) — un décalage visible, surtout à l'horizontal
 * où une colonne fait 60px contre 45px pour une ligne déjà bien alignée. */
export function snapPositionChange(
	change: NodeChange<LadderNodeType>,
): NodeChange<LadderNodeType> {
	if (change.type !== "position" || !change.position) return change;
	const row = Math.round(yToRow(change.position.y));
	const col = Math.round(xToCol(change.position.x));
	return {
		...change,
		position: { x: colToX(col), y: rowToY(row) },
	};
}

/** Dernière frame d'un glisser (`dragging: false`) ou relâchement d'une flèche directionnelle
 * (`dragging` alors `undefined` — voir `useMoveSelectedNodes` de la lib) : jamais une frame
 * intermédiaire (`dragging: true`), pour ne pas dispatcher une commande à chaque pixel. */
export function isFinishedPositionChange(
	change: NodeChange,
): change is NodePositionChange {
	return (
		change.type === "position" && change.dragging !== true && !!change.position
	);
}

export function cellOf(position: { x: number; y: number }): GridPosition {
	return {
		row: Math.round(yToRow(position.y)),
		col: Math.round(xToCol(position.x)),
	};
}

/** Résout un `NodeChange` en élément du domaine + position en grille — `null` pour une borne
 * d'alimentation virtuelle (non persistée, jamais draggable, voir `buildTargetNodes`) ou un id
 * ne correspondant à aucun élément. Partagé entre l'aperçu en direct du coude (chaque frame)
 * et la commande persistée (dernière frame seulement). */
export function resolveMovedElement(
	section: Section,
	elementId: string,
	position: { x: number; y: number },
): { elementId: string; newPosition: GridPosition } | null {
	if (parseVirtualRailRow(elementId) !== null) return null;
	if (!section.getElement(elementId)) return null;
	const row = Math.round(yToRow(position.y));
	const col = Math.round(xToCol(position.x));
	return { elementId, newPosition: { row, col } };
}

/**
 * Un glisser peut inverser l'ordre colonne d'un élément déjà connecté par rapport à un voisin,
 * ce que `ConnectionsAddCommand`/`isConnectionAllowed` (cible strictement à droite de la
 * source) n'a l'occasion de garantir qu'à la création d'une connexion, jamais quand un élément
 * connecté bouge ensuite — voir `computeNetworkAssignments` du pré-compilateur, qui trie les
 * éléments par colonne croissante et suppose la source déjà traitée avant sa cible. Une même
 * colonne pour les deux (le nœud déplacé "rattrape" son voisin, un cas de glisser normal et
 * testé) reste tolérée : seule une inversion franche casserait ce tri.
 */
export function isPositionValidForConnections(
	section: Section,
	elementId: string,
	newPosition: GridPosition,
): boolean {
	for (const connection of section.connections) {
		if (connection.source.id === elementId) {
			const target = section.getElement(connection.target.id);
			if (target && target.position.col < newPosition.col) return false;
		}
		if (connection.target.id === elementId) {
			const source = section.getElement(connection.source.id);
			if (source && newPosition.col < source.position.col) return false;
		}
	}
	return true;
}

/**
 * Un déplacement d'un seul nœud passe par le recâblage (`buildRewireCommands`) plutôt que par
 * le simple changement de position quand la nouvelle cellule :
 * - inverserait l'ordre colonne d'une connexion existante du nœud, ou
 * - se pose sur un fil dont le nœud ne fait pas partie — épissure : X0→X2 devient X0→X1→X2.
 * Sinon le chemin historique suffit et préserve les coudes personnalisés.
 */
export function singleMoveNeedsRewire(
	section: Section,
	element: LadderElement,
	newPosition: GridPosition,
): boolean {
	if (!isPositionValidForConnections(section, element.id, newPosition))
		return true;
	const through = findCellCrossings(
		section,
		newPosition.row,
		newPosition.col,
	).through;
	return (
		!!through &&
		through.source.id !== element.id &&
		through.target.id !== element.id
	);
}

/** Vrai si l'empreinte de `movedElement`, posée sur `cell`, chevaucherait celle d'un élément
 * de la section — `movingIds` exclut tous les nœuds du geste en cours (chacun libère sa propre
 * cellule) et les bornes d'alimentation ne comptent pas. */
export function collidesOnGrid(
	section: Section,
	movedElement: LadderElement,
	cell: GridPosition,
	movingIds: Set<string>,
): boolean {
	const rect = {
		row: cell.row,
		col: cell.col,
		width: getElementWidth(movedElement),
		height: getElementHeight(movedElement),
	};
	return section.elements.some(
		(element) =>
			!movingIds.has(element.id) &&
			element.type !== "railTerminal" &&
			cellRectsOverlap(rect, elementFootprint(element)),
	);
}

/**
 * Vrai si `cell` est un atterrissage acceptable pour `element` : empreinte libre, et — sauf
 * `allowInversion` — sans inversion de l'ordre colonne d'une connexion existante. Un
 * déplacement d'un seul nœud autorise l'inversion : elle sera résolue par un recâblage
 * (`buildRewireCommands`) plutôt que par un blocage. Un déplacement multiple ne le peut pas
 * (recâblage par membre contre une section figée non fiable), il bloque comme avant.
 */
export function isCellAcceptable(
	section: Section,
	element: LadderElement,
	cell: GridPosition,
	movingIds: Set<string>,
	allowInversion: boolean,
): boolean {
	if (collidesOnGrid(section, element, cell, movingIds)) return false;
	return allowInversion || isPositionValidForConnections(section, element.id, cell);
}

/**
 * Applique la contrainte de grille à un lot de changements d'une même frame :
 * - frame intermédiaire (`dragging: true`) d'un déplacement multiple : si l'un des nœuds du lot
 *   vient survoler une cellule inacceptable, tout le lot est gelé sur sa position rendue
 *   actuelle — le geste « bute » sans jamais superposer visuellement deux nœuds, et le lot ne
 *   se déchire pas (les membres non bloqués n'avancent pas non plus) ;
 * - frame intermédiaire d'un déplacement d'un seul nœud : jamais gelée — le nœud suit
 *   librement le curseur, quitte à chevaucher transitoirement un voisin, pour pouvoir glisser
 *   de l'autre côté de celui-ci (le lâcher déclenchera un recâblage). Geler ici reviendrait à
 *   réécrire `position` sous le drag de React Flow, qui perd alors le nœud et interrompt le
 *   geste ;
 * - frame finale (`dragging` faux/`undefined`) : le nœud se pose sur la cellule visée si elle
 *   est acceptable, sinon sur sa dernière cellule acceptable survolée (position rendue), sinon
 *   sur sa position d'origine.
 */
export function constrainBatchToGrid(
	changes: NodeChange<LadderNodeType>[],
	section: Section,
	nodes: LadderNodeType[],
): NodeChange<LadderNodeType>[] {
	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const movingIds = new Set(
		changes.flatMap((change) =>
			change.type === "position" &&
			change.position &&
			section.getElement(change.id)
				? [change.id]
				: [],
		),
	);
	const allowInversion = movingIds.size === 1;

	const anyIntermediateBlock =
		!allowInversion &&
		changes.some((change) => {
			if (change.type !== "position" || !change.position) return false;
			if (change.dragging !== true) return false;
			const element = section.getElement(change.id);
			if (!element) return false;
			return !isCellAcceptable(
				section,
				element,
				cellOf(change.position),
				movingIds,
				allowInversion,
			);
		});

	return changes.map((change) => {
		if (change.type !== "position" || !change.position) return change;
		const current = nodeById.get(change.id);

		if (change.dragging === true) {
			return anyIntermediateBlock && current
				? { ...change, position: { ...current.position } }
				: change;
		}

		return resolveFinishedMove(
			change,
			section,
			current,
			movingIds,
			allowInversion,
		);
	});
}

/** Cellule d'atterrissage d'un déplacement relâché : la cellule visée si elle est acceptable,
 * sinon la dernière cellule acceptable survolée (position rendue), sinon la position d'origine
 * de l'élément. */
export function resolveFinishedMove(
	change: NodePositionChange,
	section: Section,
	current: LadderNodeType | undefined,
	movingIds: Set<string>,
	allowInversion: boolean,
): NodeChange<LadderNodeType> {
	if (!change.position) return change;
	const element = section.getElement(change.id);
	if (!element) return change;

	const acceptable = (cell: GridPosition) =>
		isCellAcceptable(section, element, cell, movingIds, allowInversion);

	let landing = cellOf(change.position);
	if (!acceptable(landing) && current) {
		landing = cellOf(current.position);
	}
	if (!acceptable(landing)) {
		landing = { row: element.position.row, col: element.position.col };
	}
	return {
		...change,
		position: { x: colToX(landing.col), y: rowToY(landing.row) },
	};
}

/** Connexions directement reliées au nœud déplacé (`elementId`) : leur coude est poussé (ou,
 * pour une connexion jusqu'ici sur une même ligne, matérialisée pour la première fois) — jamais
 * celles d'un autre nœud, voir `pushConnectionBend`. Une reconvergence sur la même ligne laisse
 * `points` intact (mémoire du dernier coude), voir `computeConnectionSegments`. Calculé à
 * chaque frame du geste (pas seulement la dernière, voir `handleNodesChange`) — toujours
 * relatif à `connection.data.points` tel que *persisté* (jamais recalculé en cascade depuis un
 * aperçu de la frame précédente), donc sans dérive au fil du geste. */
export function computeConnectionBendUpdates(
	section: Section,
	elementId: string,
	newPosition: GridPosition,
): BendUpdate[] {
	const updates: BendUpdate[] = [];
	const movedElement = section.getElement(elementId);
	if (!movedElement) return updates;
	for (const connection of section.connections) {
		const isSource = connection.source.id === elementId;
		const isTarget = connection.target.id === elementId;
		if (!isSource && !isTarget) continue;
		const other = section.getElement(
			isSource ? connection.target.id : connection.source.id,
		);
		if (!other) continue;

		const sourcePos = isSource ? newPosition : other.position;
		const targetPos = isSource ? other.position : newPosition;
		const sourceWidth = getElementWidth(isSource ? movedElement : other);

		const previousPoints = connection.data.points;
		let newPoints: [number, number][];
		if (previousPoints.length === 0) {
			if (sourcePos.row === targetPos.row) continue;
			newPoints = initialConnectionPoints(sourcePos, targetPos, sourceWidth);
		} else if (sourcePos.row === targetPos.row) {
			continue;
		} else {
			newPoints = pushConnectionBend(
				previousPoints,
				isSource ? "source" : "target",
				sourcePos,
				targetPos,
				sourceWidth,
			);
		}

		if (deepObjectsComparison(newPoints, previousPoints)) continue;
		updates.push({ connectionId: connection.id, newPoints, previousPoints });
	}
	return updates;
}

/**
 * Changements de position d'un déplacement des éléments sélectionnés au clavier (une cellule de
 * grille par appui), destinés à être passés à `LadderWorkflowManager.handleNodesChange` comme une
 * frame de glisser relâchée (`dragging: false`) — toute la suite (accrochage, collision, gel du
 * lot, recâblage sur inversion, poussée des coudes) est celle du glisser à la souris.
 *
 * Déplacement d'un seul élément : la cellule cible est bornée à la grille puis laissée au pipeline
 * (qui autorise l'inversion via recâblage, ou annule si vraiment bloquée). Déplacement multiple :
 * tout ou rien — si un seul membre ne peut pas se poser (hors grille, empreinte occupée, inversion
 * d'une connexion), aucun ne bouge, pour ne pas déformer l'agencement sélectionné.
 */
export function buildKeyboardMoveChanges(
	section: Section,
	selectedElementIds: string[],
	dRow: number,
	dCol: number,
): NodePositionChange[] {
	const movable = selectedElementIds
		.map((id) => section.getElement(id))
		.filter(
			(element): element is LadderElement =>
				!!element && element.type !== "railTerminal",
		);
	if (movable.length === 0) return [];

	const movingIds = new Set(movable.map((element) => element.id));
	const allowInversion = movingIds.size === 1;
	const maxRow = computeSectionLayout(section).totalRows;

	const moves = movable.map((element) => {
		const width = getElementWidth(element);
		const rawRow = element.position.row + dRow;
		const rawCol = element.position.col + dCol;
		const cell: GridPosition = {
			row: Math.min(Math.max(0, rawRow), maxRow),
			col: Math.min(Math.max(0, rawCol), LADDER_MAX_COLS - width),
		};
		const inBounds =
			rawRow >= 0 &&
			rawRow <= maxRow &&
			rawCol >= 0 &&
			rawCol <= LADDER_MAX_COLS - width;
		return { element, cell, inBounds };
	});

	if (
		!allowInversion &&
		!moves.every(
			(move) =>
				move.inBounds &&
				isCellAcceptable(section, move.element, move.cell, movingIds, false),
		)
	) {
		return [];
	}

	return moves
		.filter(
			(move) =>
				move.cell.row !== move.element.position.row ||
				move.cell.col !== move.element.position.col,
		)
		.map((move) => ({
			id: move.element.id,
			type: "position" as const,
			position: { x: colToX(move.cell.col), y: rowToY(move.cell.row) },
			dragging: false,
		}));
}
