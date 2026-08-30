import AbstractLadderCommand from "@/schemas/ladder/commands/abstract-ladder.command";
import {
	CounterBlockParams,
	TimerBlockParams,
} from "@/schemas/ladder/block.schema";
import { PendingSystemBlockEdit } from "@/ui/utils/ladder/ladder-system-block-drag";
import { CoilType, ContactType } from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { LadderNodeType } from "@/ui/components/ladder/flow/ladder-nodes-definitions";
import {
	buildKeyboardMoveChanges,
	constrainBatchToGrid,
	snapPositionChange,
} from "@/ui/utils/ladder/ladder-node-move";
import {
	applyEdgeChanges,
	applyNodeChanges,
	EdgeChange,
	NodeChange,
	Edge,
} from "@xyflow/react";
import LadderEdgesFactory from "../factories/edges.factory";
import LadderNodesFactory from "../factories/nodes.factory";
import {
	LadderStoreGetFunction,
	LadderStoreSetFunction,
} from "../ladder.store";
import LadderElementOpsManager from "./element-ops.manager";
import LadderMoveManager from "./move.manager";
import LadderSelectionManager, {
	withSelectionClearedOutside,
} from "./selection.manager";

/**
 * Patche `nodesBySectionId`/`edgesBySectionId` directement (comme le `GrafcetWorkflowManager`
 * patche `nodes`/`edges`), au lieu de les redériver du domaine à chaque rendu : le
 * retour visuel "en direct" pendant un glisser ou une flèche directionnelle vient alors
 * gratuitement d'`applyNodeChanges`, sans overlay ni réconciliation séparée.
 *
 * Façade : la géométrie de grille pure vit dans `@/ui/utils/ladder/ladder-node-move`, la
 * traduction déplacement → commandes dans `LadderMoveManager`, la sélection globale dans
 * `LadderSelectionManager`, l'édition d'éléments dans `LadderElementOpsManager`.
 */
export default class LadderWorkflowManager {
	private setStoreState: LadderStoreSetFunction;
	private getStoreState: LadderStoreGetFunction;

	private moveManager = new LadderMoveManager();
	private selectionManager: LadderSelectionManager;
	private elementOpsManager: LadderElementOpsManager;

	constructor(
		setStoreState: LadderStoreSetFunction,
		getStoreState: LadderStoreGetFunction,
	) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
		this.selectionManager = new LadderSelectionManager(
			setStoreState,
			getStoreState,
		);
		this.elementOpsManager = new LadderElementOpsManager(
			setStoreState,
			getStoreState,
		);
	}

	handleNodesChange(
		sectionId: string,
		changes: NodeChange<LadderNodeType>[],
	): void {
		const state = this.getStoreState();
		const section = state.ladder.getSection(sectionId);
		const nodes = state.nodesBySectionId[sectionId] ?? [];

		// La suppression passe exclusivement par `useLadderDeleteHandler`
		// (ElementsRemoveCommand/ConnectionsRemoveCommand) : un changement "remove" ici patcherait
		// le tableau en double, en course avec la resynchronisation que cette commande déclenche
		// déjà (voir `LadderCommandsStackManager.applyLadder`).
		const snapped = changes
			.filter((change) => change.type !== "remove")
			.map((change) => snapPositionChange(change));

		const changesToApply = section
			? constrainBatchToGrid(snapped, section, nodes)
			: snapped;

		const newNodes = applyNodeChanges<LadderNodeType>(changesToApply, nodes);

		const currentEdges = state.edgesBySectionId[sectionId] ?? [];
		const { edges: newEdges, commands } = section
			? this.moveManager.derivePositionEffects(
					section,
					changesToApply,
					currentEdges,
				)
			: { edges: currentEdges, commands: [] as AbstractLadderCommand<unknown>[] };

		const selectsThisSection = changesToApply.some(
			(change) => change.type === "select" && change.selected,
		);

		this.setStoreState((s) => {
			const cleared = withSelectionClearedOutside(
				s,
				sectionId,
				selectsThisSection,
			);
			return {
				nodesBySectionId: {
					...cleared.nodesBySectionId,
					[sectionId]: newNodes,
				},
				edgesBySectionId: {
					...cleared.edgesBySectionId,
					[sectionId]: newEdges,
				},
			};
		});
		if (commands.length > 0)
			state.commandsStackManager.executeOperation(commands);
	}

	/**
	 * Déplacement des éléments sélectionnés d'une cellule de grille (`dRow`/`dCol` ∈ {-1, 0, 1}),
	 * déclenché au clavier. Reformule le geste en une frame de glisser relâchée passée à
	 * `handleNodesChange` : accrochage, collision, gel du lot multiple, recâblage sur inversion et
	 * poussée des coudes sont exactement ceux du glisser à la souris.
	 */
	moveSelectedElementsByCells(
		sectionId: string,
		dRow: number,
		dCol: number,
	): void {
		const state = this.getStoreState();
		const section = state.ladder.getSection(sectionId);
		if (!section) return;
		const selectedIds = (state.nodesBySectionId[sectionId] ?? [])
			.filter((node) => node.selected)
			.map((node) => node.id);
		if (selectedIds.length === 0) return;
		const changes = buildKeyboardMoveChanges(
			section,
			selectedIds,
			dRow,
			dCol,
		);
		if (changes.length === 0) return;
		this.handleNodesChange(sectionId, changes);
	}

	handleEdgesChange(sectionId: string, changes: EdgeChange[]): void {
		const state = this.getStoreState();
		const edges = state.edgesBySectionId[sectionId] ?? [];
		const newEdges = applyEdgeChanges(changes, edges);
		const selectsThisSection = changes.some(
			(change) => change.type === "select" && change.selected,
		);
		this.setStoreState((s) => {
			const cleared = withSelectionClearedOutside(
				s,
				sectionId,
				selectsThisSection,
			);
			return {
				nodesBySectionId: cleared.nodesBySectionId,
				edgesBySectionId: {
					...cleared.edgesBySectionId,
					[sectionId]: newEdges,
				},
			};
		});
	}

	// ── Sélection (déléguée à LadderSelectionManager) ────────────────────────

	getNodes(sectionId: string): LadderNodeType[] {
		return this.selectionManager.getNodes(sectionId);
	}

	getEdges(sectionId: string): Edge[] {
		return this.selectionManager.getEdges(sectionId);
	}

	selectAllNodesAndEdges(sectionId: string): void {
		this.selectionManager.selectAllNodesAndEdges(sectionId);
	}

	deselectAllElements(): void {
		this.selectionManager.deselectAllElements();
	}

	selectAllEdges(sectionId: string): void {
		this.selectionManager.selectAllEdges(sectionId);
	}

	selectAllInActiveSection(): void {
		this.selectionManager.selectAllInActiveSection();
	}

	// ── Édition d'éléments (déléguée à LadderElementOpsManager) ──────────────

	deleteSections(sectionIds: string[]): void {
		this.elementOpsManager.deleteSections(sectionIds);
	}

	deleteElements(
		sectionId: string,
		elementIds: string[],
		edgeIds: string[] = [],
	): void {
		this.elementOpsManager.deleteElements(sectionId, elementIds, edgeIds);
	}

	setContactType(
		sectionId: string,
		elementId: string,
		type: ContactType,
	): void {
		this.elementOpsManager.setContactType(sectionId, elementId, type);
	}

	setCoilType(sectionId: string, elementId: string, type: CoilType): void {
		this.elementOpsManager.setCoilType(sectionId, elementId, type);
	}

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
		this.elementOpsManager.openSystemBlockEditor(elementId, blockType, initial);
	}

	// ── Ladder ──────────────────────────────────────────────────────────────

	/** Le ladder actuellement détenu par ce store. */
	getLadder(): Ladder {
		return this.getStoreState().ladder;
	}

	/**
	 * Adopts a ladder rewritten outside of this store, typically by a project-level command
	 * (renaming a variable rewrites the contacts/coils referencing it). Miroir de
	 * `GrafcetWorkflowManager.adoptGrafcet` côté GRAFCET.
	 *
	 * No command is pushed on the ladder stack: the operation is already undoable as a whole
	 * through the project command that triggered it.
	 */
	adoptLadder(ladder: Ladder): void {
		this.setStoreState((state) => {
			const sectionIds = new Set(ladder.sections.map((s) => s.id));
			const prunedSelected = state.selectedSectionIds.filter((id) =>
				sectionIds.has(id),
			);
			return {
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
				activeSectionId:
					state.activeSectionId && sectionIds.has(state.activeSectionId)
						? state.activeSectionId
						: null,
				selectedSectionIds:
					prunedSelected.length === state.selectedSectionIds.length
						? state.selectedSectionIds
						: prunedSelected,
			};
		});
	}
}
