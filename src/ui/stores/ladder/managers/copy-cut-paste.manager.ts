import {
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
	LADDER_MAX_COLS,
	xToCol,
	yToRow,
} from "@/ui/utils/ladder/ladder-flow-builder";
import { computeAutoConnectionsForElements } from "@/ui/utils/ladder/ladder-auto-connect";
import { CELL_SUBDIVISIONS } from "@/ui/utils/ladder/ladder-connection-path";
import AbstractCopyCutPasteManager from "@/ui/stores/shared/abstract-copy-cut-paste.manager";

/** Renvoie la copie d'un bloc timer/compteur nommé avec un nom suffixé absent de `takenNames`
 * (qu'elle y ajoute) ; tout autre élément est renvoyé inchangé. */
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
 * Le presse-papiers ladder porte soit un fragment (éléments + connexions internes à une
 * sélection), soit une ou plusieurs sections entières. Un seul presse-papiers vivant : copier
 * des sections écrase un fragment et inversement, et `pasteElements` route selon `kind`.
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
	) {
		super();
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
	 * Copie une ou plusieurs sections entières (titre, description, éléments, connexions) — clone
	 * défensif, réordonné selon l'ordre du ladder.
	 */
	copySections(sectionIds: string[]): void {
		const ordered = this.getStoreState().ladder.sections.filter((s) =>
			sectionIds.includes(s.id),
		);
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
		const startRow = Math.max(0, Math.floor(yToRow(flowPos.y)));
		const startCol = Math.max(0, Math.floor(xToCol(flowPos.x)));

		// Bounding box des éléments copiés
		const minRow = Math.min(
			...clipboard.elements.map((e) => e.position.row),
		);
		const minCol = Math.min(
			...clipboard.elements.map((e) => e.position.col),
		);
		const maxCol = Math.max(
			...clipboard.elements.map((e) => e.position.col),
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

			for (const copiedEl of clipboard.elements) {
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

		// Un bloc timer/compteur collé ne peut pas garder le nom de son original : ce nom identifie
		// l'instance dans tout le ladder (voir `LadderAnalyser.checkBlockNameConflicts`). La copie
		// est suffixée (`Tempo` -> `Tempo_2`), en accumulant pour un collage multi-blocs.
		const takenBlockNames = new Set(
			state.ladder.getAllElements().flatMap((el) => {
				const params =
					el.type === "block"
						? getTimerBlockParams(el) ?? getCounterBlockParams(el)
						: null;
				return params?.name ? [params.name] : [];
			}),
		);

		// Création des nouveaux éléments
		const idMap = new Map<string, string>();
		const newElements = clipboard.elements.map((el) => {
			const newId = createRandomId();
			idMap.set(el.id, newId);
			return {
				...withCopiedBlockName(el, takenBlockNames),
				id: newId,
				position: {
					row: el.position.row + offsetRow,
					col: el.position.col + offsetCol,
				},
			} as LadderElement;
		});

		// Création des nouvelles connexions
		const newConnections = clipboard.connections
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

	/**
	 * Duplique une section : la copie est insérée juste sous l'originale.
	 */
	duplicateSection(sectionId: string): void {
		const ladder = this.getStoreState().ladder;
		const source = ladder.getSection(sectionId);
		if (!source) return;
		const sourceIndex = ladder.sections.findIndex((s) => s.id === sectionId);
		this.insertSections([source], sourceIndex + 1);
	}

	/**
	 * Colle les sections du presse-papiers en bloc consécutif : juste sous la section active
	 * (`activeSectionId`) si elle existe, sinon tout en bas. Leur ordre relatif est conservé.
	 */
	pasteSections(sections: Section[]): void {
		const { ladder, activeSectionId } = this.getStoreState();
		const activeIndex = activeSectionId
			? ladder.sections.findIndex((s) => s.id === activeSectionId)
			: -1;
		const atIndex =
			activeIndex >= 0 ? activeIndex + 1 : ladder.sections.length;
		this.insertSections(sections, atIndex);
	}

	/**
	 * Insère de nouvelles sections reprenant le titre, la description et le contenu de chaque
	 * `source`, en bloc à partir de `atIndex`. Le contenu est recréé avec la sémantique d'un
	 * collage — nouveaux identifiants pour chaque élément et chaque connexion, blocs timer/
	 * compteur renommés pour rester des instances uniques dans le ladder cible (le suffixage
	 * s'accumule d'une section à l'autre, voir `withCopiedBlockName`). Les positions sont
	 * conservées : les sections cibles étant vides, aucune gestion de collision n'est nécessaire.
	 */
	private insertSections(sources: Section[], atIndex: number): void {
		if (sources.length === 0) return;
		const state = this.getStoreState();
		const ladder = state.ladder;

		const takenBlockNames = new Set(
			ladder.getAllElements().flatMap((el) => {
				const params =
					el.type === "block"
						? getTimerBlockParams(el) ?? getCounterBlockParams(el)
						: null;
				return params?.name ? [params.name] : [];
			}),
		);

		const commands: AbstractLadderCommand<any>[] = [];
		const newSectionIds: string[] = [];

		for (const source of sources) {
			const newSectionId = createRandomId();
			newSectionIds.push(newSectionId);

			const idMap = new Map<string, string>();
			const newElements = source.elements.map((el) => {
				const newId = createRandomId();
				idMap.set(el.id, newId);
				return {
					...withCopiedBlockName(el, takenBlockNames),
					id: newId,
					position: { ...el.position },
				} as LadderElement;
			});

			const newConnections = source.connections
				.map((conn) => {
					const sourceElId = idMap.get(conn.source.id);
					const targetElId = idMap.get(conn.target.id);
					if (!sourceElId || !targetElId) return null;
					return new Connection(
						createRandomId(),
						{
							id: sourceElId,
							type: conn.source.type as any,
							handle: conn.source.handle,
						},
						{
							id: targetElId,
							type: conn.target.type as any,
							handle: conn.target.handle,
						},
						{
							points: conn.data.points.map(
								(p) => [p[0], p[1]] as [number, number],
							),
						},
					);
				})
				.filter((c): c is Connection => c !== null);

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
		// `SectionAddCommand` pousse chaque section en fin de liste, dans l'ordre : un reorder
		// n'est utile que si la cible n'est pas déjà cette dernière position.
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
