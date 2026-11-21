import {
	getElementHeight,
	getElementWidth,
	LadderElement,
} from "@/schemas/ladder/element.schema";
import { getTimerBlockParams } from "@/schemas/ladder/function-blocks/timer.schema";
import { getCounterBlockParams } from "@/schemas/ladder/function-blocks/counter.schema";
import Connection from "@/schemas/ladder/connection.schema";
import Section from "@/schemas/ladder/section.schema";
import { createRandomId } from "@/ids";
import { nextCopyName } from "@/lib/naming";
import {
	LadderStoreGetFunction,
	LadderStoreSetFunction,
} from "../ladder.store";
import ElementsAddCommand from "@/schemas/ladder/commands/elements-add.command";
import ConnectionsAddCommand from "@/schemas/ladder/commands/connections-add.command";
import ConnectionsRemoveCommand from "@/schemas/ladder/commands/connections-remove.command";
import SectionAddCommand from "@/schemas/ladder/commands/section-add.command";
import SectionReorderCommand from "@/schemas/ladder/commands/section-reorder.command";
import AbstractLadderCommand from "@/schemas/ladder/commands/abstract-ladder.command";
import {
	computeSectionLayout,
	findFootprintCollision,
	LADDER_MAX_COLS,
	xToCol,
	yToRow,
} from "@/ui/utils/ladder/ladder-flow-builder";
import { computeAutoConnectionsForElements } from "@/ui/utils/ladder/ladder-auto-connect";
import { CELL_SUBDIVISIONS } from "@/ui/utils/ladder/ladder-connection-path";
import type { ClipboardStore } from "@/ui/stores/shared/clipboard.store";
import AbstractCopyCutPasteManager from "@/ui/stores/shared/abstract-copy-cut-paste.manager";

/** Returns a copy of a named timer/counter block whose name is suffixed so that it is absent from
 * `takenNames` (the new name is added to it); any other element is returned unchanged. */
function withCopiedBlockName(
	element: LadderElement,
	takenNames: Set<string>,
): LadderElement {
	if (element.type !== "block") return element;
	const params = getTimerBlockParams(element) ?? getCounterBlockParams(element);
	if (!params?.name) return element;
	const name = nextCopyName(params.name, [...takenNames]);
	takenNames.add(name);
	return {
		...element,
		data: { ...element.data, params: { ...element.data.params, name } },
	} as LadderElement;
}

/**
 * Clones the elements and the connections whose two ends are among them, with new ids, shifted by
 * `offset` (cells). Timer/counter blocks are renamed through `takenBlockNames`, which accumulates
 * from one call to the next.
 */
function cloneWithNewIds(
	elements: LadderElement[],
	connections: Connection[],
	takenBlockNames: Set<string>,
	offset = { row: 0, col: 0 },
): { elements: LadderElement[]; connections: Connection[] } {
	const idMap = new Map<string, string>();
	const newElements = elements.map((el) => {
		const newId = createRandomId();
		idMap.set(el.id, newId);
		return {
			...withCopiedBlockName(el, takenBlockNames),
			id: newId,
			position: {
				row: el.position.row + offset.row,
				col: el.position.col + offset.col,
			},
		} as LadderElement;
	});

	const newConnections: Connection[] = [];
	for (const conn of connections) {
		const sourceId = idMap.get(conn.source.id);
		const targetId = idMap.get(conn.target.id);
		if (!sourceId || !targetId) continue;
		newConnections.push(
			new Connection(
				createRandomId(),
				{ ...conn.source, id: sourceId },
				{ ...conn.target, id: targetId },
				{
					points: conn.data.points.map(
						(p) =>
							[
								p[0] + offset.row * CELL_SUBDIVISIONS,
								p[1] + offset.col * CELL_SUBDIVISIONS,
							] as [number, number],
					),
				},
			),
		);
	}
	return { elements: newElements, connections: newConnections };
}

/**
 * The ladder clipboard holds either a fragment (elements + connections internal to a selection)
 * or one or more whole sections. There is a single live clipboard: copying sections overwrites a
 * fragment and vice versa, and `pasteElements` routes on `kind`.
 */
export type LadderClipboard =
	| { kind: "elements"; elements: LadderElement[]; connections: Connection[] }
	| { kind: "sections"; sections: Section[] };

export default class LadderCopyCutPasteManager extends AbstractCopyCutPasteManager<LadderClipboard> {
	protected readonly scope = "ladder" as const;
	private setStoreState: LadderStoreSetFunction;
	private getStoreState: LadderStoreGetFunction;

	constructor(
		setStoreState: LadderStoreSetFunction,
		getStoreState: LadderStoreGetFunction,
		clipboard: ClipboardStore,
	) {
		super(clipboard);
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	copySelectedElements(): void {
		const state = this.getStoreState();
		const ladder = state.ladder;

		if (state.selectedSectionIds.length > 0) {
			this.copySections(state.selectedSectionIds);
			return;
		}

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

	cutSelectedElements(): void {
		const { selectedSectionIds, workflowManager } = this.getStoreState();
		if (selectedSectionIds.length > 0) {
			this.copySections(selectedSectionIds);
			workflowManager.deleteSections(selectedSectionIds);
			return;
		}
		super.cutSelectedElements();
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
		this.writeClipboard({
			kind: "elements",
			elements: structuredClone(elements),
			connections: structuredClone(connections),
		});
	}

	/**
	 * Copies one or more whole sections (title, description, elements, connections) as a
	 * defensive clone, reordered to the ladder's order.
	 */
	copySections(sectionIds: string[]): void {
		const ordered = this.getStoreState().ladder.getSectionsInOrder(sectionIds);
		if (ordered.length === 0) return;
		this.writeClipboard({
			kind: "sections",
			sections: ordered.map((s) => s.copy()),
		});
	}

	pasteElements(mousePosition?: { x: number; y: number }): void {
		const clipboard = this.readClipboard();
		if (!clipboard) return;
		if (clipboard.kind === "sections") {
			this.pasteSections(clipboard.sections);
			return;
		}
		if (clipboard.elements.length === 0) return;
		if (!mousePosition) return;

		// Find the section under the cursor
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

		// Convert the mouse position to flow coordinates
		const flowPos = rfInstance.screenToFlowPosition({
			x: mousePosition.x,
			y: mousePosition.y,
		});

		// Convert to the starting cell
		const startRow = Math.max(0, Math.floor(yToRow(flowPos.y)));
		const startCol = Math.max(0, Math.floor(xToCol(flowPos.x)));

		// Bounding box of the copied elements
		const minRow = Math.min(...clipboard.elements.map((e) => e.position.row));
		const minCol = Math.min(...clipboard.elements.map((e) => e.position.col));
		const maxCol = Math.max(...clipboard.elements.map((e) => e.position.col));

		const width = maxCol - minCol + 1;

		// Shift left when needed so that the pasted block stays within `LADDER_MAX_COLS`.
		let offsetCol = startCol - minCol;
		let finalStartCol = startCol;

		const SECTION_MAX_COLS = LADDER_MAX_COLS;
		if (finalStartCol + width > SECTION_MAX_COLS) {
			finalStartCol = Math.max(0, SECTION_MAX_COLS - width);
			offsetCol = finalStartCol - minCol;
		}

		let offsetRow = startRow - minRow;

		// Collision handling: the full footprint overlap (width and height, see
		// `getElementWidth`/`getElementHeight`) is checked, not just an equal starting cell: a pasted
		// `block` occupies 2 columns and several rows.
		const { leafPositions } = computeSectionLayout(section);
		let collision = true;

		while (collision) {
			collision = false;
			let maxRowInCollision = -1;

			for (const copiedEl of clipboard.elements) {
				const r = copiedEl.position.row + offsetRow;
				const c = copiedEl.position.col + offsetCol;

				const occupant = findFootprintCollision(section, {
					row: r,
					col: c,
					width: getElementWidth(copiedEl),
					height: getElementHeight(copiedEl),
				});
				if (occupant) {
					collision = true;
					const occupantBottomRow =
						occupant.position.row + getElementHeight(occupant) - 1;
					if (occupantBottomRow > maxRowInCollision) {
						maxRowInCollision = occupantBottomRow;
					}
				}
			}

			if (collision) {
				// Move just below the lowest occupant found in this area
				const newStartRow = maxRowInCollision + 1;
				offsetRow = newStartRow - minRow;
			}
		}

		// A pasted timer/counter block cannot keep its original's name: the name identifies the
		// instance across the whole ladder (see `LadderAnalyser.checkBlockNameConflicts`). The copy is
		// suffixed (`Tempo` -> `Tempo_2`), accumulating across a multi-block paste.
		const takenBlockNames = state.ladder.getBlockNames();

		const { elements: newElements, connections: newConnections } =
			cloneWithNewIds(
				clipboard.elements,
				clipboard.connections,
				takenBlockNames,
				{ row: offsetRow, col: offsetCol },
			);

		// Apply the drop rules to the newly pasted elements
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

		const copiedPairs = new Set(
			newConnections.map((c) => `${c.source.id}>${c.target.id}`),
		);
		const finalConnections = [
			...newConnections,
			...autoConnections.filter(
				(c) => !copiedPairs.has(`${c.source.id}>${c.target.id}`),
			),
		];

		// Run the commands
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

	/**
	 * Duplicates a section: the copy is inserted right below the original.
	 */
	duplicateSection(sectionId: string): void {
		const ladder = this.getStoreState().ladder;
		const source = ladder.getSection(sectionId);
		if (!source) return;
		const sourceIndex = ladder.sections.findIndex((s) => s.id === sectionId);
		this.insertSections([source], sourceIndex + 1);
	}

	/**
	 * Pastes the clipboard's sections as one consecutive block: right below the active section
	 * (`activeSectionId`) if there is one, otherwise at the very bottom. Their relative order is
	 * kept.
	 */
	pasteSections(sections: Section[]): void {
		const { ladder, activeSectionId } = this.getStoreState();
		const activeIndex = activeSectionId
			? ladder.sections.findIndex((s) => s.id === activeSectionId)
			: -1;
		const atIndex = activeIndex >= 0 ? activeIndex + 1 : ladder.sections.length;
		this.insertSections(sections, atIndex);
	}

	/**
	 * Inserts new sections carrying the title, description and content of each `source`, as a
	 * block starting at `atIndex`. The content is recreated with paste semantics: new ids for every
	 * element and connection, timer/counter blocks renamed to remain unique instances in the target
	 * ladder (the suffixing accumulates from one section to the next, see `withCopiedBlockName`).
	 * Positions are kept: the target sections are empty, so no collision handling is needed.
	 */
	private insertSections(sources: Section[], atIndex: number): void {
		if (sources.length === 0) return;
		const state = this.getStoreState();
		const ladder = state.ladder;

		const takenBlockNames = ladder.getBlockNames();

		const commands: AbstractLadderCommand<any>[] = [];
		const newSectionIds: string[] = [];

		for (const source of sources) {
			const newSectionId = createRandomId();
			newSectionIds.push(newSectionId);

			const { elements: newElements, connections: newConnections } =
				cloneWithNewIds(source.elements, source.connections, takenBlockNames);

			commands.push(
				new SectionAddCommand({
					sectionId: newSectionId,
					title: source.title,
					description: source.description,
				}),
				new ElementsAddCommand({
					sectionId: newSectionId,
					elements: newElements,
				}),
			);
			if (newConnections.length > 0) {
				commands.push(
					new ConnectionsAddCommand({
						sectionId: newSectionId,
						connections: newConnections,
					}),
				);
			}
		}

		const previousOrderedSectionIds = ladder.sections.map((s) => s.id);
		// `SectionAddCommand` pushes each section at the end of the list, in order: a reorder is
		// only useful when the target is not already that last position.
		if (atIndex < previousOrderedSectionIds.length) {
			commands.push(
				new SectionReorderCommand({
					orderedSectionIds: [
						...previousOrderedSectionIds.slice(0, atIndex),
						...newSectionIds,
						...previousOrderedSectionIds.slice(atIndex),
					],
					previousOrderedSectionIds,
				}),
			);
		}

		state.commandsStackManager.executeOperation(commands);
	}
}
