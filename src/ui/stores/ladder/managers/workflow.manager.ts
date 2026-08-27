import { deepObjectsComparison } from "@/lib/object";
import AbstractLadderCommand from "@/schemas/ladder/commands/abstract-ladder.command";
import ConnectionUpdateCommand from "@/schemas/ladder/commands/connection-update.command";
import ConnectionsRemoveCommand from "@/schemas/ladder/commands/connections-remove.command";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import ElementsRemoveCommand from "@/schemas/ladder/commands/elements-remove.command";
import {
	CounterBlockParams,
	TimerBlockParams,
} from "@/schemas/ladder/block.schema";
import { PendingSystemBlockEdit } from "@/ui/utils/ladder/ladder-system-block-drag";
import { getElementWidth, GridPosition } from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Section from "@/schemas/ladder/section.schema";
import { LadderNodeType } from "@/ui/components/ladder/flow/ladder-nodes-definitions";
import {
	colToX,
	computeRowHeightsInCells,
	parseVirtualRailRow,
	rowToY,
	xToCol,
	yToRow,
} from "@/ui/utils/ladder/ladder-flow-builder";
import {
	initialConnectionPoints,
	pushConnectionBend,
} from "@/ui/utils/ladder/ladder-connection-path";
import {
	applyEdgeChanges,
	applyNodeChanges,
	EdgeChange,
	NodeChange,
	NodePositionChange,
	Edge,
} from "@xyflow/react";
import LadderEdgesFactory from "../factories/edges.factory";
import LadderNodesFactory from "../factories/nodes.factory";
import {
	LadderStoreGetFunction,
	LadderStoreSetFunction,
} from "../ladder.store";

/**
 * Patche `nodesBySectionId`/`edgesBySectionId` directement (comme le `GrafcetWorkflowManager`
 * patche `nodes`/`edges`), au lieu de les redériver du domaine à chaque rendu : le
 * retour visuel "en direct" pendant un glisser ou une flèche directionnelle vient alors
 * gratuitement d'`applyNodeChanges`, sans overlay ni réconciliation séparée.
 */
export default class LadderWorkflowManager {
	private setStoreState: LadderStoreSetFunction;
	private getStoreState: LadderStoreGetFunction;

	constructor(
		setStoreState: LadderStoreSetFunction,
		getStoreState: LadderStoreGetFunction,
	) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	handleNodesChange(
		sectionId: string,
		changes: NodeChange<LadderNodeType>[],
	): void {
		const state = this.getStoreState();
		const section = state.ladder.getSection(sectionId);
		const rowHeightsInCells = section
			? computeRowHeightsInCells(section)
			: new Map<number, number>();

		// La suppression passe exclusivement par `useLadderDeleteHandler`
		// (ElementsRemoveCommand/ConnectionsRemoveCommand) : un changement "remove" ici patcherait
		// le tableau en double, en course avec la resynchronisation que cette commande déclenche
		// déjà (voir `LadderCommandsStackManager.applyLadder`).
		const changesToApply = changes
			.filter((change) => change.type !== "remove")
			.map((change) => this.snapPositionChange(change, rowHeightsInCells))
			.map((change) =>
				section
					? this.revertInvalidFinishedMove(change, section, rowHeightsInCells)
					: change,
			);

		const nodes = state.nodesBySectionId[sectionId] ?? [];
		const newNodes = applyNodeChanges<LadderNodeType>(changesToApply, nodes);

		let newEdges = state.edgesBySectionId[sectionId] ?? [];
		const commands: (ElementUpdateCommand | ConnectionUpdateCommand)[] = [];

		if (section) {
			for (const change of changesToApply) {
				if (change.type !== "position" || !change.position) continue;
				const resolved = this.resolveMovedElement(
					section,
					change.id,
					change.position,
					rowHeightsInCells,
				);
				if (!resolved) continue;

				// Aperçu en direct du coude poussé, à CHAQUE frame (pas seulement la dernière) : sans
				// ça, `points` ne change qu'au relâchement (voir plus bas) et le tracé reste figé
				// pendant tout le geste — le nœud déplacé semble alors passer au travers du segment
				// vertical au lieu de le pousser, qui ne "rattrape" le nœud qu'à la fin.
				const bendUpdates = this.computeConnectionBendUpdates(
					section,
					resolved.elementId,
					resolved.newPosition,
				);
				if (bendUpdates.length > 0) {
					newEdges = newEdges.map((edge) => {
						const update = bendUpdates.find((u) => u.connectionId === edge.id);
						return update
							? { ...edge, data: { ...edge.data, points: update.newPoints } }
							: edge;
					});
				}

				if (!this.isFinishedPositionChange(change)) continue;
				const built = this.buildPositionCommand(section, resolved);
				if (!built) continue;
				commands.push(built);
				commands.push(
					...bendUpdates.map(
						(u) =>
							new ConnectionUpdateCommand({
								connectionId: u.connectionId,
								changes: { points: u.newPoints },
								previousChanges: {
									points: u.previousPoints.map(([r, c]) => [r, c]),
								},
							}),
					),
				);
			}
		}

		this.setStoreState((s) => ({
			nodesBySectionId: { ...s.nodesBySectionId, [sectionId]: newNodes },
			edgesBySectionId: { ...s.edgesBySectionId, [sectionId]: newEdges },
		}));
		if (commands.length > 0)
			state.commandsStackManager.executeOperation(commands);
	}

	handleEdgesChange(sectionId: string, changes: EdgeChange[]): void {
		const state = this.getStoreState();
		const edges = state.edgesBySectionId[sectionId] ?? [];
		const newEdges = applyEdgeChanges(changes, edges);
		this.setStoreState((s) => ({
			edgesBySectionId: { ...s.edgesBySectionId, [sectionId]: newEdges },
		}));
	}

	/** Accroche chaque frame (pas seulement la dernière) à la grille de colonnes/lignes réelle —
	 * `<ReactFlow snapGrid>` ne peut pas le faire lui-même : il n'accroche qu'à des multiples
	 * bruts de sa valeur depuis l'origine, alors que les colonnes réelles sont décalées de
	 * `POWER_RAIL_OFFSET`. Sans ce recalage, le nœud suit un pas plus fin que la colonne pendant
	 * le geste (`RAIL_LANE_WIDTH`) et corrige brusquement en fin de geste vers la colonne la plus
	 * proche (calculée ici même, voir `buildPositionCommand`) — un décalage visible, surtout à
	 * l'horizontal où une colonne fait 60px contre 45px pour une ligne déjà bien alignée. */
	private snapPositionChange(
		change: NodeChange<LadderNodeType>,
		rowHeightsInCells: Map<number, number>,
	): NodeChange<LadderNodeType> {
		if (change.type !== "position" || !change.position) return change;
		const row = Math.round(yToRow(change.position.y, rowHeightsInCells));
		const col = Math.round(xToCol(change.position.x));
		return {
			...change,
			position: { x: colToX(col), y: rowToY(row, rowHeightsInCells) },
		};
	}

	/** Dernière frame d'un glisser (`dragging: false`) ou relâchement d'une flèche directionnelle
	 * (`dragging` alors `undefined` — voir `useMoveSelectedNodes` de la lib) : jamais une frame
	 * intermédiaire (`dragging: true`), pour ne pas dispatcher une commande à chaque pixel. */
	private isFinishedPositionChange(
		change: NodeChange,
	): change is NodePositionChange {
		return (
			change.type === "position" &&
			change.dragging !== true &&
			!!change.position
		);
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
	private isPositionValidForConnections(
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

	/** Ramène à sa position d'origine la dernière frame d'un glisser qui violerait l'ordre de
	 * colonnes d'une connexion existante (voir `isPositionValidForConnections`) — les frames
	 * intermédiaires (`dragging: true`) restent libres, pour ne pas saccader le geste tant qu'il
	 * n'est pas relâché. */
	private revertInvalidFinishedMove(
		change: NodeChange<LadderNodeType>,
		section: Section,
		rowHeightsInCells: Map<number, number>,
	): NodeChange<LadderNodeType> {
		if (!this.isFinishedPositionChange(change) || !change.position)
			return change;
		const resolved = this.resolveMovedElement(
			section,
			change.id,
			change.position,
			rowHeightsInCells,
		);
		if (!resolved) return change;
		if (
			this.isPositionValidForConnections(
				section,
				resolved.elementId,
				resolved.newPosition,
			)
		)
			return change;
		const element = section.getElement(resolved.elementId)!;
		return {
			...change,
			position: {
				x: colToX(element.position.col),
				y: rowToY(element.position.row, rowHeightsInCells),
			},
		};
	}

	/** Résout un `NodeChange` en élément du domaine + position en grille — `null` pour une borne
	 * d'alimentation virtuelle (non persistée, jamais draggable, voir `buildTargetNodes`) ou un id
	 * ne correspondant à aucun élément. Partagé entre l'aperçu en direct du coude (chaque frame)
	 * et la commande persistée (dernière frame seulement). */
	private resolveMovedElement(
		section: Section,
		elementId: string,
		position: { x: number; y: number },
		rowHeightsInCells: Map<number, number>,
	): { elementId: string; newPosition: GridPosition } | null {
		if (parseVirtualRailRow(elementId) !== null) return null;
		if (!section.getElement(elementId)) return null;
		const row = Math.round(yToRow(position.y, rowHeightsInCells));
		const col = Math.round(xToCol(position.x));
		return { elementId, newPosition: { row, col } };
	}

	private buildPositionCommand(
		section: Section,
		resolved: { elementId: string; newPosition: GridPosition },
	): ElementUpdateCommand | null {
		const element = section.getElement(resolved.elementId)!;
		if (
			resolved.newPosition.row === element.position.row &&
			resolved.newPosition.col === element.position.col
		) {
			return null;
		}
		return new ElementUpdateCommand({
			elementId: element.id,
			changes: { position: resolved.newPosition },
			previousChanges: {
				position: { row: element.position.row, col: element.position.col },
			},
		});
	}

	/** Connexions directement reliées au nœud déplacé (`elementId`) : leur coude est poussé (ou,
	 * pour une connexion jusqu'ici sur une même ligne, matérialisée pour la première fois) — jamais
	 * celles d'un autre nœud, voir `pushConnectionBend`. Une reconvergence sur la même ligne laisse
	 * `points` intact (mémoire du dernier coude), voir `computeConnectionSegments`. Calculé à
	 * chaque frame du geste (pas seulement la dernière, voir `handleNodesChange`) — toujours
	 * relatif à `connection.data.points` tel que *persisté* (jamais recalculé en cascade depuis un
	 * aperçu de la frame précédente), donc sans dérive au fil du geste. */
	private computeConnectionBendUpdates(
		section: Section,
		elementId: string,
		newPosition: GridPosition,
	): {
		connectionId: string;
		newPoints: [number, number][];
		previousPoints: [number, number][];
	}[] {
		const updates: {
			connectionId: string;
			newPoints: [number, number][];
			previousPoints: [number, number][];
		}[] = [];
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

	// ── Helpers de sélection (utilisés par le pane context menu) ──────────────

	getNodes(sectionId: string): LadderNodeType[] {
		return this.getStoreState().nodesBySectionId[sectionId] ?? [];
	}

	getEdges(sectionId: string): Edge[] {
		return this.getStoreState().edgesBySectionId[sectionId] ?? [];
	}

	selectAllNodesAndEdges(sectionId: string): void {
		this.setStoreState((state) => ({
			nodesBySectionId: {
				...(state.nodesBySectionId || {}),
				[sectionId]: (state.nodesBySectionId[sectionId] ?? []).map((n) => ({
					...n,
					selected: true,
				})),
			},
			edgesBySectionId: {
				...(state.edgesBySectionId || {}),
				[sectionId]: (state.edgesBySectionId[sectionId] ?? []).map((e) => ({
					...e,
					selected: true,
				})),
			},
		}));
	}

	selectAllEdges(sectionId: string): void {
		this.setStoreState((state) => ({
			edgesBySectionId: {
				...(state.edgesBySectionId || {}),
				[sectionId]: (state.edgesBySectionId[sectionId] ?? []).map((e) => ({
					...e,
					selected: true,
				})),
			},
		}));
	}

	/**
	 * Sélectionne tout dans la dernière section sur laquelle l'utilisateur a interagi
	 * (`activeSectionId`, alimentée au clic dans une section) : à la différence du GRAFCET, un
	 * Ladder a plusieurs sections indépendantes, donc « tout sélectionner » n'a de sens que
	 * relativement à l'une d'elles.
	 */
	selectAllInActiveSection(): void {
		const sectionId = this.getStoreState().activeSectionId;
		if (!sectionId) return;
		this.selectAllNodesAndEdges(sectionId);
	}

	/**
	 * Adopts a ladder rewritten outside of this store, typically by a project-level command
	 * (renaming a variable rewrites the contacts/coils referencing it). Miroir de
	 * `GrafcetWorkflowManager.adoptGrafcet` côté GRAFCET.
	 *
	 * No command is pushed on the ladder stack: the operation is already undoable as a whole
	 * through the project command that triggered it.
	 */
	/** Le ladder actuellement détenu par ce store. */
	getLadder(): Ladder {
		return this.getStoreState().ladder;
	}

	adoptLadder(ladder: Ladder): void {
		this.setStoreState((state) => ({
			ladder,
			nodesBySectionId: Object.fromEntries(
				ladder.sections.map((section) => [
					section.id,
					LadderNodesFactory.syncNodes(
						state.nodesBySectionId[section.id] ?? [],
						section,
					),
				]),
			),
			edgesBySectionId: Object.fromEntries(
				ladder.sections.map((section) => [
					section.id,
					LadderEdgesFactory.syncEdges(
						state.edgesBySectionId[section.id] ?? [],
						section,
					),
				]),
			),
		}));
	}

	/**
	 * Supprime des éléments (et, en cascade, les connexions qui les touchent) et des connexions
	 * isolées d'une section. Partagée par `useLadderDeleteHandler` (touche Suppr, menu
	 * contextuel) et par le couper (Ctrl+X) : la cascade élément → connexions ne doit exister
	 * qu'à un seul endroit.
	 */
	deleteElements(
		sectionId: string,
		elementIds: string[],
		edgeIds: string[] = [],
	): void {
		const section = this.getStoreState().ladder.getSection(sectionId);
		if (!section) return;
		const removedElementIds = new Set(
			elementIds.filter((id) => section.getElement(id)),
		);
		const commands: AbstractLadderCommand<any>[] = [];

		if (removedElementIds.size > 0) {
			const elements = [...removedElementIds].map((id) => ({
				sectionId: section.id,
				element: section.getElement(id)!,
			}));
			const touchedConnections = section.connections
				.filter(
					(c) =>
						removedElementIds.has(c.source.id) ||
						removedElementIds.has(c.target.id),
				)
				.map((connection) => ({ sectionId: section.id, connection }));
			commands.push(
				new ElementsRemoveCommand({
					elements,
					connections: touchedConnections,
				}),
			);
		}

		//Connexions supprimées isolément (aucune de leurs extrémités n'est déjà couverte par la
		//cascade d'ElementsRemoveCommand ci-dessus).
		const standaloneConnections = edgeIds
			.map((id) => section.connections.find((c) => c.id === id))
			.filter((c): c is NonNullable<typeof c> => !!c)
			.filter(
				(c) =>
					!removedElementIds.has(c.source.id) &&
					!removedElementIds.has(c.target.id),
			);
		if (standaloneConnections.length > 0) {
			commands.push(
				new ConnectionsRemoveCommand({
					sectionId: section.id,
					connections: standaloneConnections,
				}),
			);
		}

		if (commands.length > 0)
			this.getStoreState().commandsStackManager.executeOperation(commands);
	}

	/**
	 * Ouvre la fenêtre de configuration d'un bloc système existant, préremplie — déclenché par le
	 * double-clic sur le bloc dans le canevas ou par "Paramétrer" dans le menu contextuel de
	 * l'explorateur (voir `useBlockInstanceMenuItems`), qui appelle cette méthode une fois la page
	 * du ladder ciblé devenue active.
	 */
	// `blockType` doit être fourni explicitement par l'appelant plutôt que déduit de la présence
	// d'un champ (comme `timerType`/`counterType` le permettent pour timer/counter). Les blocs
	// `"compare"`/`"assign"`/`"arithmetic"` n'ont pas de fenêtre : ils se configurent sur le canevas.
	openSystemBlockEditor(
		elementId: string,
		blockType: "timer",
		initial: TimerBlockParams,
	): void;
	openSystemBlockEditor(
		elementId: string,
		blockType: "counter",
		initial: CounterBlockParams,
	): void;
	openSystemBlockEditor(
		elementId: string,
		blockType: PendingSystemBlockEdit["blockType"],
		initial: TimerBlockParams | CounterBlockParams,
	): void {
		this.setStoreState({
			pendingSystemBlockEdit: {
				blockType,
				elementId,
				initial,
			} as PendingSystemBlockEdit,
		});
	}
}
