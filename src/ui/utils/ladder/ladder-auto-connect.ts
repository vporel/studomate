import Connection from "@/schemas/ladder/connection.schema";
import { LadderElement, createRailTerminalElement } from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import { createRandomId } from "@/ids";
import { findCellCrossings, initialConnectionPoints } from "./ladder-connection-path";
import { resolveDropTarget } from "./ladder-drop-target";
import { PositionedLeaf } from "./ladder-flow-builder";

export function computeAutoConnectionsForElements(
	section: Section,
	elementsToPlace: LadderElement[],
	leafPositions: PositionedLeaf[],
	isPaste: boolean = false,
): { elementsToAdd: LadderElement[]; connectionsToAdd: Connection[]; connectionsToRemove: Connection[] } {
	const newRailsToAdd: LadderElement[] = [];
	const connectionsToAdd: Connection[] = [];
	const connectionsToRemove: Connection[] = [];

	// Pour éviter de chercher dans le vide ou de créer des doublons de rails
	const addedRails = new Map<number, LadderElement>();

	const getElement = (id: string) =>
		elementsToPlace.find((e) => e.id === id) ||
		newRailsToAdd.find((e) => e.id === id) ||
		section.getElement(id);

	for (const newElement of elementsToPlace) {
		const dropRow = newElement.position.row;
		const dropCol = newElement.position.col;

		const crossings = findCellCrossings(section, dropRow, dropCol);

		if (crossings.through || crossings.left || crossings.right) {
			const connectionTo = (sourceElement: LadderElement) =>
				new Connection(
					createRandomId(),
					{ id: sourceElement.id, type: sourceElement.type as any, handle: "source" },
					{ id: newElement.id, type: newElement.type as any, handle: "target" },
					{ points: initialConnectionPoints(sourceElement.position, newElement.position) },
				);
			const connectionFrom = (targetElement: LadderElement) =>
				new Connection(
					createRandomId(),
					{ id: newElement.id, type: newElement.type as any, handle: "source" },
					{ id: targetElement.id, type: targetElement.type as any, handle: "target" },
					{ points: initialConnectionPoints(newElement.position, targetElement.position) },
				);

			if (crossings.through) {
				const throughSource = section.getElement(crossings.through.source.id);
				const throughTarget = section.getElement(crossings.through.target.id);
				if (throughSource) connectionsToAdd.push(connectionTo(throughSource));
				if (throughTarget) connectionsToAdd.push(connectionFrom(throughTarget));
				connectionsToRemove.push(crossings.through);
			} else {
				const leftSource = crossings.left && section.getElement(crossings.left.source.id);
				if (leftSource) connectionsToAdd.push(connectionTo(leftSource));

				const rightTarget =
					crossings.right &&
					newElement.type !== "coil" &&
					section.getElement(crossings.right.target.id);
				if (rightTarget) connectionsToAdd.push(connectionFrom(rightTarget));
			}
		} else {
			// 1. Voisin de gauche
			let leftSource: LadderElement | null = null;
			if (dropCol === 0) {
				// Connexion automatique au rail d'alimentation
				let rail =
					addedRails.get(dropRow) ||
					section.elements.find((e) => e.type === "railTerminal" && e.position.row === dropRow);
				if (!rail) {
					rail = createRailTerminalElement(dropRow);
					addedRails.set(dropRow, rail);
					newRailsToAdd.push(rail);
				}
				leftSource = rail;
			} else {
				if (!isPaste) {
					// Drop : le noeud le plus proche à gauche, même s'il n'est pas strictement adjacent
					const target = resolveDropTarget(leafPositions, dropRow, dropCol);
					if (target.sourceId) {
						leftSource = getElement(target.sourceId) || null;
					}
				} else {
					// Paste : UNIQUEMENT le voisin strictement adjacent à gauche
					leftSource =
						section.getLeftNeighbor(dropRow, dropCol) ||
						elementsToPlace.find(
							(e) => e.position.row === dropRow && e.position.col === dropCol - 1,
						) ||
						null;
				}
			}

			if (leftSource) {
				connectionsToAdd.push(
					new Connection(
						createRandomId(),
						{ id: leftSource.id, type: leftSource.type as any, handle: "source" },
						{ id: newElement.id, type: newElement.type as any, handle: "target" },
						{ points: initialConnectionPoints(leftSource.position, newElement.position) },
					),
				);
			}

			// 2. Voisin de droite
			if (newElement.type !== "coil") {
				const rightNeighbor =
					section.getRightNeighbor(dropRow, dropCol) ||
					elementsToPlace.find((e) => e.position.row === dropRow && e.position.col === dropCol + 1);

				if (rightNeighbor) {
					connectionsToAdd.push(
						new Connection(
							createRandomId(),
							{ id: newElement.id, type: newElement.type as any, handle: "source" },
							{ id: rightNeighbor.id, type: rightNeighbor.type as any, handle: "target" },
							{ points: initialConnectionPoints(newElement.position, rightNeighbor.position) },
						),
					);
				}
			}
		}
	}

	return { elementsToAdd: [...newRailsToAdd, ...elementsToPlace], connectionsToAdd, connectionsToRemove };
}
