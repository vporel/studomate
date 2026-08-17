"use client";

import AbstractLadderCommand from "@/schemas/ladder/commands/abstract-ladder.command";
import ConnectionsAddCommand from "@/schemas/ladder/commands/connections-add.command";
import ConnectionsRemoveCommand from "@/schemas/ladder/commands/connections-remove.command";
import ElementsAddCommand from "@/schemas/ladder/commands/elements-add.command";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import { createContactElement, createCoilElement, LadderElement } from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { useLadderStore } from "../context/LadderContext";
import { DraggedLadderElement, useLadderToolbarDnD } from "../toolbar/LadderToolbarDnDContext";
import { PositionedLeaf, xToCol, yToRow } from "@/ui/utils/ladder/ladder-flow-builder";
import { computeAutoConnectionsForElements } from "@/ui/utils/ladder/ladder-auto-connect";

function createDraggedElement(draggedElement: DraggedLadderElement, row: number, col: number): LadderElement {
	return draggedElement.type === "contact"
		? createContactElement("", draggedElement.mode, row, col)
		: createCoilElement("", draggedElement.mode, row, col);
}

/**
 * Résout et dispatche l'insertion d'un contact/bobine déposé sur le canevas : la position est
 * accrochée à la grille (`resolveDropTarget`) et devient exactement celle de l'élément posé.
 */
export default function useLadderDropHandlers(
	section: Section,
	leafPositions: PositionedLeaf[],
): [handleDragOver: (e: React.DragEvent) => void, handleDrop: (e: React.DragEvent) => void] {
	const { draggedElement } = useLadderToolbarDnD();
	const { screenToFlowPosition } = useReactFlow();
	const commandsStackManager = useLadderStore((state) => state.commandsStackManager);

	const handleDragOver = useCallback(
		(e: React.DragEvent) => {
			// Toujours appeler preventDefault : draggedElement peut encore être null au premier
			// dragover (timing React).
			e.preventDefault();
			e.dataTransfer.dropEffect = draggedElement ? "copy" : "none";
		},
		[draggedElement],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			if (!draggedElement) return;

			// screenToFlowPosition attend des coordonnées viewport (clientX/clientY), pas
			// document (pageX/pageY) — sensibles au défilement de la page, qui décale tout calcul
			// de cellule (voir la doc de @xyflow/react sur screenToFlowPosition).
			// { snapToGrid: false } : le composant <ReactFlow> a snapToGrid/snapGrid activés
			// pour le déplacement des nœuds existants, mais screenToFlowPosition applique ce
			// même snapGrid par défaut (arrondi au plus proche, pas au sol) à CE calcul aussi si
			// on ne l'en exempte pas explicitement — ce qui décalait le dépôt vers la cellule
			// diagonale suivante dès que le curseur dépassait le milieu d'une cellule. On garde
			// notre propre accrochage explicite (Math.floor ci-dessous), qui, lui, retombe
			// toujours sur la cellule réellement visée.
			const position = screenToFlowPosition({ x: e.clientX, y: e.clientY }, { snapToGrid: false });
			const dropRow = Math.floor(yToRow(position.y));
			const dropCol = Math.floor(xToCol(position.x));

			// Cellule déjà occupée : refuse le dépôt, sauf si l'élément qui s'y trouve est du même
			// genre que celui déposé — auquel cas on change juste son mode (ex. contact NO -> NF),
			// la variable et les connexions restant inchangées. Le switch (plutôt qu'un simple
			// `occupant.type !== draggedElement.type`) est exhaustif sur
			// `DraggedLadderElement` : un nouveau genre d'outil déposable ne compile plus tant que
			// son comportement de remplacement n'a pas été décidé ici.
			const occupant = section.elements.find(
				(element) => element.position.row === dropRow && element.position.col === dropCol,
			);
			if (occupant) {
				switch (draggedElement.type) {
					case "contact":
					case "coil": {
						if (occupant.type !== draggedElement.type) return;
						if (occupant.data.mode === draggedElement.mode) return;
						commandsStackManager.executeOperation([
							new ElementUpdateCommand({
								elementId: occupant.id,
								changes: { data: { mode: draggedElement.mode } },
								previousChanges: { data: { mode: occupant.data.mode } },
							}),
						]);
						return;
					}
					default: {
						const _exhaustive: never = draggedElement;
						return _exhaustive;
					}
				}
			}

			const newElement = createDraggedElement(draggedElement, dropRow, dropCol);

			const { elementsToAdd, connectionsToAdd, connectionsToRemove } = computeAutoConnectionsForElements(
				section,
				[newElement],
				leafPositions
			);

			const commands: AbstractLadderCommand<any>[] = [
				new ElementsAddCommand({ sectionId: section.id, elements: elementsToAdd }),
			];

			if (connectionsToAdd.length > 0) {
				commands.push(new ConnectionsAddCommand({ sectionId: section.id, connections: connectionsToAdd }));
			}
			
			if (connectionsToRemove.length > 0) {
				commands.push(new ConnectionsRemoveCommand({ sectionId: section.id, connections: connectionsToRemove }));
			}

			commandsStackManager.executeOperation(commands);
		},
		[draggedElement, screenToFlowPosition, leafPositions, section, commandsStackManager],
	);

	return [handleDragOver, handleDrop];
}
