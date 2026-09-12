import { createRandomId } from "@/ids";
import AbstractLadderCommand from "@/schemas/ladder/commands/abstract-ladder.command";
import ConnectionUpdateCommand from "@/schemas/ladder/commands/connection-update.command";
import ConnectionsAddCommand from "@/schemas/ladder/commands/connections-add.command";
import ConnectionsRemoveCommand from "@/schemas/ladder/commands/connections-remove.command";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import ElementsAddCommand from "@/schemas/ladder/commands/elements-add.command";
import Connection from "@/schemas/ladder/connection.schema";
import {
	getElementWidth,
	GridPosition,
	LadderElement,
} from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import { LadderNodeType } from "@/ui/components/ladder/flow/ladder-nodes-definitions";
import { initialConnectionPoints } from "@/ui/utils/ladder/ladder-connection-path";
import { computeAutoConnectionsForElements } from "@/ui/utils/ladder/ladder-auto-connect";
import {
	BendUpdate,
	computeConnectionBendUpdates,
	isFinishedPositionChange,
	resolveMovedElement,
	singleMoveNeedsRewire,
} from "@/ui/utils/ladder/ladder-node-move";
import { Edge, NodeChange } from "@xyflow/react";

type ResolvedMove = { elementId: string; newPosition: GridPosition };

/**
 * Traduit les changements de position d'une frame React Flow en aperçu des coudes (à chaque
 * frame) et en commandes persistées (dernière frame seulement) — recâblage compris quand un
 * nœud connecté franchit l'ordre colonne d'un voisin. Aucun accès au store : `LadderWorkflowManager`
 * lui passe la section et les arêtes courantes, applique le résultat.
 */
export default class LadderMoveManager {
	/**
	 * Applique les changements de position d'une frame à `currentEdges` (aperçu des coudes) et
	 * collecte les commandes à exécuter si la frame est finale. `section` reste l'état persisté :
	 * tous les calculs sont relatifs à lui, jamais à une frame précédente.
	 */
	derivePositionEffects(
		section: Section,
		changes: NodeChange<LadderNodeType>[],
		currentEdges: Edge[],
	): { edges: Edge[]; commands: AbstractLadderCommand<unknown>[] } {
		let edges = currentEdges;
		const commands: AbstractLadderCommand<unknown>[] = [];
		const movedCount = changes.filter(
			(change) => change.type === "position" && !!change.position,
		).length;

		for (const change of changes) {
			if (change.type !== "position" || !change.position) continue;
			const resolved = resolveMovedElement(section, change.id, change.position);
			if (!resolved) continue;

			// Aperçu en direct du coude poussé, à CHAQUE frame (pas seulement la dernière) : sans
			// ça, `points` ne change qu'au relâchement et le tracé reste figé pendant tout le
			// geste — le nœud déplacé semble alors passer au travers du segment vertical au lieu
			// de le pousser, qui ne "rattrape" le nœud qu'à la fin.
			const bendUpdates = computeConnectionBendUpdates(
				section,
				resolved.elementId,
				resolved.newPosition,
			);
			if (bendUpdates.length > 0) {
				edges = edges.map((edge) => {
					const update = bendUpdates.find((u) => u.connectionId === edge.id);
					return update
						? { ...edge, data: { ...edge.data, points: update.newPoints } }
						: edge;
				});
			}

			if (!isFinishedPositionChange(change)) continue;
			commands.push(
				...this.buildMoveCommands(
					section,
					resolved,
					bendUpdates,
					movedCount === 1,
				),
			);
		}

		return { edges, commands };
	}

	private buildPositionCommand(
		section: Section,
		resolved: ResolvedMove,
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

	/**
	 * Commandes d'une frame de déplacement relâchée. Deux cas :
	 * - la nouvelle position n'inverse aucune connexion du nœud → simple changement de position +
	 *   poussée des coudes (chemin historique, préserve les coudes personnalisés) ;
	 * - elle en inverserait une (déplacement d'un seul nœud uniquement) → recâblage : le nœud est
	 *   retiré de sa chaîne, le trou refermé, puis il est redéposé à la cible comme un élément neuf
	 *   (split de la connexion traversée, sinon voisin de gauche / rail).
	 */
	private buildMoveCommands(
		section: Section,
		resolved: ResolvedMove,
		bendUpdates: BendUpdate[],
		isSingleMove: boolean,
	): AbstractLadderCommand<unknown>[] {
		const element = section.getElement(resolved.elementId);
		if (!element) return [];
		const positionCommand = this.buildPositionCommand(section, resolved);
		if (!positionCommand) return [];

		if (
			isSingleMove &&
			singleMoveNeedsRewire(section, element, resolved.newPosition)
		) {
			return this.buildRewireCommands(section, element, resolved.newPosition);
		}

		return [
			positionCommand,
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
		];
	}

	/**
	 * Recâblage d'un nœud connecté déplacé vers une position qui inverserait l'ordre d'une de ses
	 * connexions : on projette une section où le nœud a bougé et ses anciennes connexions sont
	 * retirées puis cicatrisées (chaque source entrante reliée à chaque cible sortante), on y
	 * rejoue l'auto-connexion d'un dépôt, et on compose l'opération correspondante. Une connexion
	 * de cicatrisation immédiatement splittée par le redépôt n'est jamais matérialisée.
	 */
	private buildRewireCommands(
		section: Section,
		element: LadderElement,
		newPosition: GridPosition,
	): AbstractLadderCommand<unknown>[] {
		const projected = section.copy();
		const moved = projected.getElement(element.id);
		if (!moved) return [];

		const oldConnections = projected.connections.filter(
			(c) => c.source.id === moved.id || c.target.id === moved.id,
		);
		const incomingSourceIds = oldConnections
			.filter((c) => c.target.id === moved.id)
			.map((c) => c.source.id);
		const outgoingTargetIds = oldConnections
			.filter((c) => c.source.id === moved.id)
			.map((c) => c.target.id);

		projected.connections = projected.connections.filter(
			(c) => !oldConnections.includes(c),
		);
		moved.position = { row: newPosition.row, col: newPosition.col };

		const healConnections: Connection[] = [];
		for (const sourceId of incomingSourceIds) {
			for (const targetId of outgoingTargetIds) {
				const source = projected.getElement(sourceId);
				const target = projected.getElement(targetId);
				if (!source || !target) continue;
				if (target.position.col <= source.position.col) continue;
				const exists = (list: Connection[]) =>
					list.some(
						(c) => c.source.id === sourceId && c.target.id === targetId,
					);
				if (exists(projected.connections) || exists(healConnections)) continue;
				healConnections.push(
					new Connection(
						createRandomId(),
						{ id: sourceId, type: source.type as never, handle: "source" },
						{ id: targetId, type: target.type as never, handle: "target" },
						{
							points: initialConnectionPoints(
								source.position,
								target.position,
								getElementWidth(source),
							),
						},
					),
				);
			}
		}
		projected.connections.push(...healConnections);

		const leafPositions = projected.elements
			.filter((e) => e.id !== moved.id)
			.map((e) => ({ id: e.id, row: e.position.row, col: e.position.col }));
		const auto = computeAutoConnectionsForElements(
			projected,
			[moved],
			leafPositions,
		);

		const splitConnection = auto.connectionsToRemove[0];
		const splitIsHeal =
			!!splitConnection &&
			healConnections.some((h) => h.id === splitConnection.id);

		const connectionsToRemove = [
			...oldConnections,
			...(splitConnection && !splitIsHeal ? [splitConnection] : []),
		];
		const connectionsToAdd = [
			...healConnections.filter(
				(h) => !splitConnection || h.id !== splitConnection.id,
			),
			...auto.connectionsToAdd,
		];
		const newRails = auto.elementsToAdd.filter(
			(e) => e.type === "railTerminal",
		);

		// Ajout AVANT retrait : retirer d'abord les anciennes connexions pourrait balayer en
		// cascade une borne d'alimentation (voir `ConnectionsRemoveCommand`) dont la cicatrisation
		// a justement besoin. L'état transitoire (ancienne + nouvelle connexion coexistent, parfois
		// un cycle X⇄Y) n'est jamais observé : `isConnectionAllowed` ne valide que l'ordre colonne,
		// et le pré-compilateur ne tourne pas au milieu d'une opération.
		const commands: AbstractLadderCommand<unknown>[] = [
			new ElementUpdateCommand({
				elementId: moved.id,
				changes: { position: { row: newPosition.row, col: newPosition.col } },
				previousChanges: {
					position: { row: element.position.row, col: element.position.col },
				},
			}),
		];
		if (newRails.length > 0)
			commands.push(
				new ElementsAddCommand({ sectionId: section.id, elements: newRails }),
			);
		if (connectionsToAdd.length > 0)
			commands.push(
				new ConnectionsAddCommand({
					sectionId: section.id,
					connections: connectionsToAdd,
				}),
			);
		if (connectionsToRemove.length > 0)
			commands.push(
				new ConnectionsRemoveCommand({
					sectionId: section.id,
					connections: connectionsToRemove,
				}),
			);
		return commands;
	}
}
