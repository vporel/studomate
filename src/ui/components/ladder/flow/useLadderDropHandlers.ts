"use client";

import AbstractLadderCommand from "@/schemas/ladder/commands/abstract-ladder.command";
import ConnectionsAddCommand from "@/schemas/ladder/commands/connections-add.command";
import ConnectionsRemoveCommand from "@/schemas/ladder/commands/connections-remove.command";
import ElementsAddCommand from "@/schemas/ladder/commands/elements-add.command";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import {
	createArithmeticBlockElement,
	createAssignBlockElement,
	createCompareBlockElement,
	createUserProgramBlockElement,
} from "@/schemas/ladder/block.schema";
import {
	createContactElement,
	createCoilElement,
	getElementWidth,
	LadderElement,
} from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import { createCounterBlockElement } from "@/schemas/function-blocks/counter.schema";
import { createTimerBlockElement } from "@/schemas/function-blocks/timer.schema";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { useLadderStore } from "../context/LadderContext";
import {
	DraggedLadderElement,
	useLadderToolbarDnD,
} from "../toolbar/LadderToolbarDnDContext";
import {
	computeRowHeightsInCells,
	PositionedLeaf,
	xToCol,
	yToRow,
} from "@/ui/utils/ladder/ladder-flow-builder";
import { computeAutoConnectionsForElements } from "@/ui/utils/ladder/ladder-auto-connect";
import { LADDER_PROGRAM_DRAG_MIME_TYPE } from "@/ui/utils/ladder/ladder-program-drag";
import { LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE } from "@/ui/utils/ladder/ladder-system-block-drag";

function createToolElement(
	draggedElement: DraggedLadderElement,
	row: number,
	col: number,
): LadderElement {
	return draggedElement.type === "contact"
		? createContactElement("", draggedElement.mode, row, col)
		: createCoilElement("", draggedElement.mode, row, col);
}

/** Élément existant dont l'empreinte (largeur en colonnes, voir `getElementWidth`) chevauche
 * `[colStart, colEnd]` sur `row` — un `block` occupant 2 colonnes doit bloquer un dépôt visant
 * sa seconde cellule autant que la première. */
function findOccupant(
	section: Section,
	row: number,
	colStart: number,
	colEnd: number,
): LadderElement | undefined {
	return section.elements.find((element) => {
		if (element.position.row !== row) return false;
		const elementStart = element.position.col;
		const elementEnd = elementStart + getElementWidth(element) - 1;
		return elementStart <= colEnd && elementEnd >= colStart;
	});
}

/**
 * Résout et dispatche l'insertion d'un élément déposé sur le canevas : la position est accrochée
 * à la grille (`resolveDropTarget`) et devient exactement celle de l'élément posé. Trois sources
 * de dépose bien distinctes, sans mécanisme commun :
 * - un outil de la toolbar (contact/bobine), porté par `useLadderToolbarDnD` (contexte React,
 *   source et cible partagent `LadderToolbarDnDProvider`) ;
 * - un programme glissé depuis le menu de l'explorateur (bloc "appel de programme"), porté par
 *   `DataTransfer` natif (`LADDER_PROGRAM_DRAG_MIME_TYPE`) — explorateur et éditeur ladder ne
 *   partagent aucun contexte React ;
 * - un bloc système glissé depuis la section "Blocs systèmes" de l'explorateur (jamais un outil
 *   de toolbar), porté par `DataTransfer` de la même façon (`LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE`)
 *   — mais dont le dépose n'insère rien directement : il ouvre `pendingSystemBlockCreation`, qui
 *   ne dispatche qu'à la validation de sa fenêtre de configuration.
 */
export default function useLadderDropHandlers(
	section: Section,
	leafPositions: PositionedLeaf[],
): [
	handleDragOver: (e: React.DragEvent) => void,
	handleDrop: (e: React.DragEvent) => void,
] {
	const { draggedElement } = useLadderToolbarDnD();
	const { screenToFlowPosition } = useReactFlow();
	const commandsStackManager = useLadderStore(
		(state) => state.commandsStackManager,
	);
	const setPendingSystemBlockCreation = useLadderStore(
		(state) => state.setPendingSystemBlockCreation,
	);

	const handleDragOver = useCallback(
		(e: React.DragEvent) => {
			// Toujours appeler preventDefault : draggedElement peut encore être null au premier
			// dragover (timing React). e.dataTransfer.getData n'est pas lisible au dragover (accès
			// restreint par sécurité) : seul `.types` l'est, d'où ce test plutôt qu'une lecture.
			e.preventDefault();
			const draggingProgramRef = e.dataTransfer.types.includes(
				LADDER_PROGRAM_DRAG_MIME_TYPE,
			);
			const draggingSystemBlock = e.dataTransfer.types.includes(
				LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE,
			);
			e.dataTransfer.dropEffect =
				draggedElement || draggingProgramRef || draggingSystemBlock
					? "copy"
					: "none";
		},
		[draggedElement],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			const programId = e.dataTransfer.getData(LADDER_PROGRAM_DRAG_MIME_TYPE);
			const systemBlockType = e.dataTransfer.getData(
				LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE,
			);
			if (!programId && !systemBlockType && !draggedElement) return;

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
			const position = screenToFlowPosition(
				{ x: e.clientX, y: e.clientY },
				{ snapToGrid: false },
			);
			const dropRow = Math.floor(
				yToRow(position.y, computeRowHeightsInCells(section)),
			);
			const dropCol = Math.floor(xToCol(position.x));

			if (programId) {
				// Un bloc occupe 2 colonnes (voir `getElementWidth`) : les deux cellules doivent être
				// libres. Une référence de programme n'a pas de "mode" à faire tourner comme un
				// contact/une bobine : cellule(s) déjà occupée(s), rien à changer, quel que soit
				// l'occupant.
				if (findOccupant(section, dropRow, dropCol, dropCol + 1)) return;
				const newElement = createUserProgramBlockElement(
					programId,
					dropRow,
					dropCol,
				);
				dispatchInsertion(newElement);
				return;
			}

			if (systemBlockType === "timer") {
				if (findOccupant(section, dropRow, dropCol, dropCol + 1)) return;
				setPendingSystemBlockCreation({
					blockType: "timer",
					insert: (params) =>
						dispatchInsertion(
							createTimerBlockElement(params, dropRow, dropCol),
						),
				});
				return;
			}

			if (systemBlockType === "counter") {
				if (findOccupant(section, dropRow, dropCol, dropCol + 1)) return;
				setPendingSystemBlockCreation({
					blockType: "counter",
					insert: (params) =>
						dispatchInsertion(
							createCounterBlockElement(params, dropRow, dropCol),
						),
				});
				return;
			}

			if (systemBlockType === "compare") {
				// Un bloc `"compare"` occupe 1 colonne (comme un contact, voir `getElementWidth`) et
				// n'a pas de fenêtre : on insère un bloc vide, configuré ensuite sur le canevas.
				if (findOccupant(section, dropRow, dropCol, dropCol)) return;
				dispatchInsertion(createCompareBlockElement(dropRow, dropCol));
				return;
			}

			// `"assign"` et `"arithmetic"` occupent 2 colonnes (défaut d'un bloc) et n'ont pas de
			// fenêtre : on insère un bloc vide, configuré ensuite sur le canevas.
			if (systemBlockType === "assign") {
				if (findOccupant(section, dropRow, dropCol, dropCol + 1)) return;
				dispatchInsertion(createAssignBlockElement(dropRow, dropCol));
				return;
			}

			if (systemBlockType === "arithmetic") {
				if (findOccupant(section, dropRow, dropCol, dropCol + 1)) return;
				dispatchInsertion(createArithmeticBlockElement(dropRow, dropCol));
				return;
			}

			if (!draggedElement) return;

			const occupant = findOccupant(section, dropRow, dropCol, dropCol);

			// Cellule déjà occupée : refuse le dépôt, sauf si l'élément qui s'y trouve est du même
			// genre que celui déposé — auquel cas on change juste son mode (ex. contact NO -> NF),
			// la variable et les connexions restant inchangées. Le switch (plutôt qu'un simple
			// `occupant.type !== draggedElement.type`) est exhaustif sur
			// `DraggedLadderElement` : un nouveau genre d'outil déposable ne compile plus tant que
			// son comportement de remplacement n'a pas été décidé ici.
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

			dispatchInsertion(createToolElement(draggedElement, dropRow, dropCol));

			function dispatchInsertion(newElement: LadderElement) {
				const { elementsToAdd, connectionsToAdd, connectionsToRemove } =
					computeAutoConnectionsForElements(
						section,
						[newElement],
						leafPositions,
					);

				const commands: AbstractLadderCommand<any>[] = [
					new ElementsAddCommand({
						sectionId: section.id,
						elements: elementsToAdd,
					}),
				];

				if (connectionsToAdd.length > 0) {
					commands.push(
						new ConnectionsAddCommand({
							sectionId: section.id,
							connections: connectionsToAdd,
						}),
					);
				}

				if (connectionsToRemove.length > 0) {
					commands.push(
						new ConnectionsRemoveCommand({
							sectionId: section.id,
							connections: connectionsToRemove,
						}),
					);
				}

				commandsStackManager.executeOperation(commands);
			}
		},
		[
			draggedElement,
			screenToFlowPosition,
			leafPositions,
			section,
			commandsStackManager,
			setPendingSystemBlockCreation,
		],
	);

	return [handleDragOver, handleDrop];
}
