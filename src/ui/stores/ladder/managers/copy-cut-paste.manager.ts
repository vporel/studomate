import {
	getElementWidth,
	LadderElement,
} from "@/schemas/ladder/element.schema";
import Connection from "@/schemas/ladder/connection.schema";
import { createRandomId } from "@/ids";
import {
	LadderStoreGetFunction,
	LadderStoreSetFunction,
} from "../ladder.store";
import ElementsAddCommand from "@/schemas/ladder/commands/elements-add.command";
import ConnectionsAddCommand from "@/schemas/ladder/commands/connections-add.command";
import ConnectionsRemoveCommand from "@/schemas/ladder/commands/connections-remove.command";
import AbstractLadderCommand from "@/schemas/ladder/commands/abstract-ladder.command";
import {
	computeSectionLayout,
	LADDER_MAX_COLS,
	xToCol,
	yToRow,
} from "@/ui/utils/ladder/ladder-flow-builder";
import { computeAutoConnectionsForElements } from "@/ui/utils/ladder/ladder-auto-connect";
import { CELL_SUBDIVISIONS } from "@/ui/utils/ladder/ladder-connection-path";
import AbstractCopyCutPasteManager from "@/ui/stores/shared/abstract-copy-cut-paste.manager";

export default class LadderCopyCutPasteManager extends AbstractCopyCutPasteManager<{
	elements: LadderElement[];
	connections: Connection[];
}> {
	private setStoreState: LadderStoreSetFunction;
	private getStoreState: LadderStoreGetFunction;

	constructor(
		setStoreState: LadderStoreSetFunction,
		getStoreState: LadderStoreGetFunction,
	) {
		super();
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	copySelectedElements(): void {
		const state = this.getStoreState();
		const ladder = state.ladder;

		// Find selected elements and connections
		const elements: LadderElement[] = [];
		const connections: Connection[] = [];
		const nodesIdsToCopy = new Set<string>();

		Object.entries(state.nodesBySectionId).forEach(([sectionId, nodes]) => {
			const selectedNodes = nodes.filter((n) => n.selected);
			if (selectedNodes.length === 0) return;

			const section = ladder.getSection(sectionId);
			if (!section) return;

			selectedNodes.forEach((node) => {
				const el = section.getElement(node.id);
				if (el && el.type !== "railTerminal") {
					elements.push(el);
					nodesIdsToCopy.add(el.id);
				}
			});

			const sectionEdges = state.edgesBySectionId[sectionId] || [];
			sectionEdges
				.filter((e) => e.selected)
				.forEach((edge) => {
					const conn = section.connections.find((c) => c.id === edge.id);
					if (
						conn &&
						nodesIdsToCopy.has(conn.source.id) &&
						nodesIdsToCopy.has(conn.target.id)
					) {
						connections.push(conn);
					}
				});
		});

		this.copyElements(elements, connections);
	}

	protected isSelectionEmpty(): boolean {
		const state = this.getStoreState();
		const hasSelectedNode = Object.values(state.nodesBySectionId).some(
			(nodes) => nodes.some((n) => n.selected),
		);
		const hasSelectedEdge = Object.values(state.edgesBySectionId).some(
			(edges) => edges.some((e) => e.selected),
		);
		return !hasSelectedNode && !hasSelectedEdge;
	}

	protected deleteSelectedElements(): void {
		const state = this.getStoreState();

		Object.entries(state.nodesBySectionId).forEach(([sectionId, nodes]) => {
			const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id);
			const selectedEdgeIds = (state.edgesBySectionId[sectionId] || [])
				.filter((e) => e.selected)
				.map((e) => e.id);
			if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return;
			state.workflowManager.deleteElements(
				sectionId,
				selectedNodeIds,
				selectedEdgeIds,
			);
		});
	}

	copyElements(elements: LadderElement[], connections: Connection[]): void {
		if (elements.length === 0 && connections.length === 0) return;
		this.clipboard = {
			elements: structuredClone(elements),
			connections: structuredClone(connections),
		};
	}

	pasteElements(mousePosition?: { x: number; y: number }): void {
		if (!this.clipboard || this.clipboard.elements.length === 0) return;
		if (!mousePosition) return;

		// Trouver la section sous le curseur
		const domElements = document.elementsFromPoint(
			mousePosition.x,
			mousePosition.y,
		);
		const sectionElement = domElements.find((el) =>
			el.getAttribute("data-section-id"),
		);
		if (!sectionElement) return;

		const sectionId = sectionElement.getAttribute("data-section-id")!;
		const state = this.getStoreState();
		const section = state.ladder.getSection(sectionId);
		const rfInstance = state.viewManager.getInstance(sectionId);
		if (!section || !rfInstance) return;

		// Convertir la position souris en coordonnées de flow
		const flowPos = rfInstance.screenToFlowPosition({
			x: mousePosition.x,
			y: mousePosition.y,
		});

		// Convertir en cellule de départ
		const { rowHeightsInCells } = computeSectionLayout(section);
		const startRow = Math.max(
			0,
			Math.floor(yToRow(flowPos.y, rowHeightsInCells)),
		);
		const startCol = Math.max(0, Math.floor(xToCol(flowPos.x)));

		// Bounding box des éléments copiés
		const minRow = Math.min(
			...this.clipboard.elements.map((e) => e.position.row),
		);
		const minCol = Math.min(
			...this.clipboard.elements.map((e) => e.position.col),
		);
		const maxCol = Math.max(
			...this.clipboard.elements.map((e) => e.position.col),
		);

		const width = maxCol - minCol + 1;

		// Décalage pour rester dans les limites (ex: LADDER_MAX_COLS si défini, ici on décale à gauche si besoin)
		// Le ladder n'a pas de max strict, mais on peut vérifier si on veut rester dans une certaine limite,
		// sinon on applique un offset normal.
		let offsetCol = startCol - minCol;
		let finalStartCol = startCol;

		// Si on a une limite arbitraire de 10 colonnes :
		const SECTION_MAX_COLS = LADDER_MAX_COLS;
		if (finalStartCol + width > SECTION_MAX_COLS) {
			finalStartCol = Math.max(0, SECTION_MAX_COLS - width);
			offsetCol = finalStartCol - minCol;
		}

		let offsetRow = startRow - minRow;

		// Gestion des collisions — chevauchement d'empreinte (largeur, voir `getElementWidth`), pas
		// une simple égalité de colonne : un `block` colle occupe 2 colonnes.
		const { leafPositions } = computeSectionLayout(section);
		let collision = true;

		while (collision) {
			collision = false;
			let maxRowInCollision = -1;

			for (const copiedEl of this.clipboard.elements) {
				const r = copiedEl.position.row + offsetRow;
				const c = copiedEl.position.col + offsetCol;
				const cEnd = c + getElementWidth(copiedEl) - 1;

				const occupant = section.elements.find((el) => {
					if (el.position.row !== r) return false;
					const elStart = el.position.col;
					const elEnd = elStart + getElementWidth(el) - 1;
					return elStart <= cEnd && elEnd >= c;
				});
				if (occupant) {
					collision = true;
					if (occupant.position.row > maxRowInCollision) {
						maxRowInCollision = occupant.position.row;
					}
				}
			}

			if (collision) {
				// On descend juste en dessous de l'occupant le plus bas trouvé dans cette zone
				const newStartRow = maxRowInCollision + 1;
				offsetRow = newStartRow - minRow;
			}
		}

		// Création des nouveaux éléments
		const idMap = new Map<string, string>();
		const newElements = this.clipboard.elements.map((el) => {
			const newId = createRandomId();
			idMap.set(el.id, newId);
			return {
				...el,
				id: newId,
				position: {
					row: el.position.row + offsetRow,
					col: el.position.col + offsetCol,
				},
			} as LadderElement;
		});

		// Création des nouvelles connexions
		const newConnections = this.clipboard.connections
			.map((conn) => {
				const sourceId = idMap.get(conn.source.id);
				const targetId = idMap.get(conn.target.id);
				if (!sourceId || !targetId) return null;

				const newPoints = conn.data.points.map(
					(p) =>
						[
							p[0] + offsetRow * CELL_SUBDIVISIONS,
							p[1] + offsetCol * CELL_SUBDIVISIONS,
						] as [number, number],
				);

				return new Connection(
					createRandomId(),
					{
						id: sourceId,
						type: conn.source.type as any,
						handle: conn.source.handle,
					},
					{
						id: targetId,
						type: conn.target.type as any,
						handle: conn.target.handle,
					},
					{ points: newPoints },
				);
			})
			.filter((c) => c !== null) as Connection[];

		// Application des règles de dépôt pour les nouveaux éléments collés
		const {
			elementsToAdd: finalElements,
			connectionsToAdd: autoConnections,
			connectionsToRemove: autoRemoves,
		} = computeAutoConnectionsForElements(
			section,
			newElements,
			leafPositions,
			true,
		);

		const finalConnections = [...newConnections, ...autoConnections];

		// Exécution des commandes
		const commands: AbstractLadderCommand<any>[] = [
			new ElementsAddCommand({ sectionId, elements: finalElements }),
		];
		if (finalConnections.length > 0) {
			commands.push(
				new ConnectionsAddCommand({
					sectionId,
					connections: finalConnections as Connection[],
				}),
			);
		}
		if (autoRemoves.length > 0) {
			commands.push(
				new ConnectionsRemoveCommand({ sectionId, connections: autoRemoves }),
			);
		}

		state.commandsStackManager.executeOperation(commands);
	}
}
