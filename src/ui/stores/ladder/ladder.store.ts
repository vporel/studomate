import CommandsStack from "@/schemas/commands/commands-stack.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { LadderNodeType } from "@/ui/components/ladder/flow/ladder-nodes-definitions";
import {
	PendingSystemBlockCreation,
	PendingSystemBlockEdit,
} from "@/ui/utils/ladder/ladder-system-block-drag";
import { Edge } from "@xyflow/react";
import { createStore } from "zustand";
import LadderEdgesFactory from "./factories/edges.factory";
import LadderNodesFactory from "./factories/nodes.factory";
import LadderCommandsStackManager from "./managers/commands-stack.manager";
import LadderViewManager from "./managers/view.manager";
import LadderWorkflowManager from "./managers/workflow.manager";
import LadderCopyCutPasteManager from "./managers/copy-cut-paste.manager";

export interface LadderStoreState {
	initialLadder?: Ladder; //Should never be modified, used as reference
	ladder: Ladder;

	//=============== VIEW (canevas) : un flow indépendant par section, voir LadderWorkflowManager ===
	nodesBySectionId: Record<string, LadderNodeType[]>;
	edgesBySectionId: Record<string, Edge[]>;
	workflowManager: LadderWorkflowManager;

	activeSectionId: string | null;
	setActiveSectionId: (sectionId: string | null) => void;

	//=============== COMMANDS STACK ===============
	hasCommandsToUndo: boolean;
	hasCommandsToRedo: boolean;
	commandsStackManager: LadderCommandsStackManager;
	copyCutPasteManager: LadderCopyCutPasteManager;

	//=============== VIEW (zoom partagé par toutes les sections) ===============
	zoom: number;
	viewManager: LadderViewManager;

	highlightedNodesIds: string[];
	highlightedEdgesIds: string[];

	/**
	 * Un bloc système (glissé depuis la section "Blocs systèmes" de l'explorateur, jamais un
	 * outil de la toolbar) se pose en deux temps : le dépose ouvre d'abord une fenêtre demandant
	 * sa config (nom, variante...), qui n'insère l'élément qu'à la validation. `insert` referme
	 * sur la section/position ciblées par le dépose et dispatche la commande d'insertion (+
	 * connexions auto) exactement comme un dépose immédiat — voir `useLadderDropHandlers`.
	 */
	pendingSystemBlockCreation: PendingSystemBlockCreation | null;
	setPendingSystemBlockCreation: (
		pending: PendingSystemBlockCreation | null,
	) => void;

	/**
	 * Édition d'un bloc système existant en attente de validation, ouverte par double-clic sur le
	 * bloc dans le canevas — voir `PendingSystemBlockEdit`.
	 */
	pendingSystemBlockEdit: PendingSystemBlockEdit | null;
	setPendingSystemBlockEdit: (pending: PendingSystemBlockEdit | null) => void;
}

export type LadderStoreSetFunction = (
	partial:
		| LadderStoreState
		| Partial<LadderStoreState>
		| ((
				state: LadderStoreState,
		  ) => LadderStoreState | Partial<LadderStoreState>),
) => void;

export type LadderStoreGetFunction = () => LadderStoreState;

export const createLadderStore = (
	ladder: Ladder,
	commandsStack: CommandsStack<Ladder>,
) => {
	return createStore<LadderStoreState>((set, get) => ({
		initialLadder: ladder?.copy(),
		ladder,

		//=============== VIEW (canevas) ===============
		nodesBySectionId: Object.fromEntries(
			ladder.sections.map((section) => [
				section.id,
				LadderNodesFactory.getInitialNodes(section),
			]),
		),
		edgesBySectionId: Object.fromEntries(
			ladder.sections.map((section) => [
				section.id,
				LadderEdgesFactory.getInitialEdges(section),
			]),
		),
		workflowManager: new LadderWorkflowManager(set, get),

		activeSectionId: null,
		setActiveSectionId: (sectionId) => set({ activeSectionId: sectionId }),

		//=============== COMMANDS STACK ===============
		//Lu depuis la pile, pas figé à false : l'historique survit à la fermeture de l'onglet
		//(voir LaddersManager), rouvrir un ladder doit donc montrer les boutons undo/redo
		//encore disponibles.
		hasCommandsToUndo: commandsStack.commandsToUndo.length > 0,
		hasCommandsToRedo: commandsStack.commandsToRedo.length > 0,
		commandsStackManager: new LadderCommandsStackManager(
			set,
			get,
			commandsStack,
		),
		copyCutPasteManager: new LadderCopyCutPasteManager(set, get),

		//=============== VIEW (zoom) ===============
		zoom: 1,
		viewManager: new LadderViewManager(set, get),

		highlightedNodesIds: [],
		highlightedEdgesIds: [],

		pendingSystemBlockCreation: null,
		setPendingSystemBlockCreation: (pending) =>
			set({ pendingSystemBlockCreation: pending }),

		pendingSystemBlockEdit: null,
		setPendingSystemBlockEdit: (pending) =>
			set({ pendingSystemBlockEdit: pending }),
	}));
};
