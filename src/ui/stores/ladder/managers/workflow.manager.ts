import { deepObjectsComparison } from "@/lib/object";
import ConnectionUpdateCommand from "@/schemas/ladder/commands/connection-update.command";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import { GridPosition } from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import { LadderNodeType } from "@/ui/components/ladder/flow/ladder-nodes-definitions";
import {
	GRID_CELL_HEIGHT,
	GRID_CELL_WIDTH,
	parseVirtualRailRow,
	POWER_RAIL_OFFSET,
} from "@/ui/utils/ladder/ladder-flow-builder";
import { initialConnectionPoints, pushConnectionBend } from "@/ui/utils/ladder/ladder-connection-path";
import { applyEdgeChanges, applyNodeChanges, EdgeChange, NodeChange, NodePositionChange, Edge } from "@xyflow/react";
import { LadderStoreGetFunction, LadderStoreSetFunction } from "../ladder.store";

/**
 * Patche `nodesBySectionId`/`edgesBySectionId` directement (comme le `WorkflowManager` du
 * GRAFCET patche `nodes`/`edges`), au lieu de les redériver du domaine à chaque rendu : le
 * retour visuel "en direct" pendant un glisser ou une flèche directionnelle vient alors
 * gratuitement d'`applyNodeChanges`, sans overlay ni réconciliation séparée.
 */
export default class LadderWorkflowManager {
	private setStoreState: LadderStoreSetFunction;
	private getStoreState: LadderStoreGetFunction;

	constructor(setStoreState: LadderStoreSetFunction, getStoreState: LadderStoreGetFunction) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	handleNodesChange(sectionId: string, changes: NodeChange<LadderNodeType>[]): void {
		// La suppression passe exclusivement par `useLadderDeleteHandler`
		// (ElementsRemoveCommand/ConnectionsRemoveCommand) : un changement "remove" ici patcherait
		// le tableau en double, en course avec la resynchronisation que cette commande déclenche
		// déjà (voir `CommandsStackManager.applyLadder`).
		const changesToApply = changes.filter((change) => change.type !== "remove").map((change) => this.snapPositionChange(change));

		const state = this.getStoreState();
		const nodes = state.nodesBySectionId[sectionId] ?? [];
		const newNodes = applyNodeChanges<LadderNodeType>(changesToApply, nodes);

		const section = state.ladder.getSection(sectionId);
		let newEdges = state.edgesBySectionId[sectionId] ?? [];
		const commands: (ElementUpdateCommand | ConnectionUpdateCommand)[] = [];

		if (section) {
			for (const change of changesToApply) {
				if (change.type !== "position" || !change.position) continue;
				const resolved = this.resolveMovedElement(section, change.id, change.position);
				if (!resolved) continue;

				// Aperçu en direct du coude poussé, à CHAQUE frame (pas seulement la dernière) : sans
				// ça, `points` ne change qu'au relâchement (voir plus bas) et le tracé reste figé
				// pendant tout le geste — le nœud déplacé semble alors passer au travers du segment
				// vertical au lieu de le pousser, qui ne "rattrape" le nœud qu'à la fin.
				const bendUpdates = this.computeConnectionBendUpdates(section, resolved.elementId, resolved.newPosition);
				if (bendUpdates.length > 0) {
					newEdges = newEdges.map((edge) => {
						const update = bendUpdates.find((u) => u.connectionId === edge.id);
						return update ? { ...edge, data: { ...edge.data, points: update.newPoints } } : edge;
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
								previousChanges: { points: u.previousPoints.map(([r, c]) => [r, c]) },
							}),
					),
				);
			}
		}

		this.setStoreState((s) => ({
			nodesBySectionId: { ...s.nodesBySectionId!, [sectionId]: newNodes },
			edgesBySectionId: { ...s.edgesBySectionId!, [sectionId]: newEdges },
		}));
		if (commands.length > 0) state.commandsStackManager.executeOperation(commands);
	}

	handleEdgesChange(sectionId: string, changes: EdgeChange[]): void {
		const state = this.getStoreState();
		const edges = state.edgesBySectionId[sectionId] ?? [];
		const newEdges = applyEdgeChanges(changes, edges);
		this.setStoreState((s) => ({ edgesBySectionId: { ...s.edgesBySectionId!, [sectionId]: newEdges } }));
	}

	/** Accroche chaque frame (pas seulement la dernière) à la grille de colonnes/lignes réelle —
	 * `<ReactFlow snapGrid>` ne peut pas le faire lui-même : il n'accroche qu'à des multiples
	 * bruts de sa valeur depuis l'origine, alors que les colonnes réelles sont décalées de
	 * `POWER_RAIL_OFFSET`. Sans ce recalage, le nœud suit un pas plus fin que la colonne pendant
	 * le geste (`RAIL_LANE_WIDTH`) et corrige brusquement en fin de geste vers la colonne la plus
	 * proche (calculée ici même, voir `buildPositionCommand`) — un décalage visible, surtout à
	 * l'horizontal où une colonne fait 60px contre 45px pour une ligne déjà bien alignée. */
	private snapPositionChange(change: NodeChange<LadderNodeType>): NodeChange<LadderNodeType> {
		if (change.type !== "position" || !change.position) return change;
		const row = Math.round(change.position.y / GRID_CELL_HEIGHT);
		const col = Math.round((change.position.x - POWER_RAIL_OFFSET) / GRID_CELL_WIDTH);
		return { ...change, position: { x: POWER_RAIL_OFFSET + col * GRID_CELL_WIDTH, y: row * GRID_CELL_HEIGHT } };
	}

	/** Dernière frame d'un glisser (`dragging: false`) ou relâchement d'une flèche directionnelle
	 * (`dragging` alors `undefined` — voir `useMoveSelectedNodes` de la lib) : jamais une frame
	 * intermédiaire (`dragging: true`), pour ne pas dispatcher une commande à chaque pixel. */
	private isFinishedPositionChange(change: NodeChange): change is NodePositionChange {
		return change.type === "position" && change.dragging !== true && !!change.position;
	}

	/** Résout un `NodeChange` en élément du domaine + position en grille — `null` pour une borne
	 * d'alimentation virtuelle (non persistée, jamais draggable, voir `buildTargetNodes`) ou un id
	 * ne correspondant à aucun élément. Partagé entre l'aperçu en direct du coude (chaque frame)
	 * et la commande persistée (dernière frame seulement). */
	private resolveMovedElement(
		section: Section,
		elementId: string,
		position: { x: number; y: number },
	): { elementId: string; newPosition: GridPosition } | null {
		if (parseVirtualRailRow(elementId) !== null) return null;
		if (!section.getElement(elementId)) return null;
		const row = Math.round(position.y / GRID_CELL_HEIGHT);
		const col = Math.round((position.x - POWER_RAIL_OFFSET) / GRID_CELL_WIDTH);
		return { elementId, newPosition: { row, col } };
	}

	private buildPositionCommand(
		section: Section,
		resolved: { elementId: string; newPosition: GridPosition },
	): ElementUpdateCommand | null {
		const element = section.getElement(resolved.elementId)!;
		if (resolved.newPosition.row === element.position.row && resolved.newPosition.col === element.position.col) {
			return null;
		}
		return new ElementUpdateCommand({
			elementId: element.id,
			changes: { position: resolved.newPosition },
			previousChanges: { position: { row: element.position.row, col: element.position.col } },
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
	): { connectionId: string; newPoints: [number, number][]; previousPoints: [number, number][] }[] {
		const updates: { connectionId: string; newPoints: [number, number][]; previousPoints: [number, number][] }[] = [];
		for (const connection of section.connections) {
			const isSource = connection.source.id === elementId;
			const isTarget = connection.target.id === elementId;
			if (!isSource && !isTarget) continue;
			const other = section.getElement(isSource ? connection.target.id : connection.source.id);
			if (!other) continue;

			const sourcePos = isSource ? newPosition : other.position;
			const targetPos = isSource ? other.position : newPosition;

			const previousPoints = connection.data.points;
			let newPoints: [number, number][];
			if (previousPoints.length === 0) {
				if (sourcePos.row === targetPos.row) continue;
				newPoints = initialConnectionPoints(sourcePos, targetPos);
			} else if (sourcePos.row === targetPos.row) {
				continue;
			} else {
				newPoints = pushConnectionBend(previousPoints, isSource ? "source" : "target", sourcePos, targetPos);
			}

			if (deepObjectsComparison(newPoints, previousPoints)) continue;
			updates.push({ connectionId: connection.id, newPoints, previousPoints });
		}
		return updates;
	}

	// ── Helpers de sélection (utilisés par le pane context menu) ──────────────

	getNodes(sectionId: string): LadderNodeType[] {
		return this.getStoreState().nodesBySectionId?.[sectionId] ?? [];
	}

	getEdges(sectionId: string): Edge[] {
		return this.getStoreState().edgesBySectionId?.[sectionId] ?? [];
	}

	selectAllNodesAndEdges(sectionId: string): void {
		this.setStoreState((state) => ({
			nodesBySectionId: {
				...(state.nodesBySectionId || {}),
				[sectionId]: (state.nodesBySectionId?.[sectionId] ?? []).map((n) => ({ ...n, selected: true })),
			},
			edgesBySectionId: {
				...(state.edgesBySectionId || {}),
				[sectionId]: (state.edgesBySectionId?.[sectionId] ?? []).map((e) => ({ ...e, selected: true })),
			},
		}));
	}

	selectAllEdges(sectionId: string): void {
		this.setStoreState((state) => ({
			edgesBySectionId: {
				...(state.edgesBySectionId || {}),
				[sectionId]: (state.edgesBySectionId?.[sectionId] ?? []).map((e) => ({ ...e, selected: true })),
			},
		}));
	}
}
