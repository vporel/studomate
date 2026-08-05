import CommandsStack from "@/schemas/commands/commands-stack.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { LadderNodeType } from "@/ui/components/ladder/flow/ladder-nodes-definitions";
import { Edge } from "@xyflow/react";
import { createStore } from "zustand";
import LadderEdgesFactory from "./factories/edges.factory";
import LadderNodesFactory from "./factories/nodes.factory";
import CommandsStackManager from "./managers/commands-stack.manager";
import ViewManager from "./managers/view.manager";
import LadderWorkflowManager from "./managers/workflow.manager";
import CopyCutPasteManager from "./managers/copy-cut-paste.manager";

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
	commandsStackManager: CommandsStackManager;
	copyCutPasteManager: CopyCutPasteManager;

	//=============== VIEW (zoom partagé par toutes les sections) ===============
	zoom: number;
	viewManager: ViewManager;

	highlightedNodesIds: string[];
	highlightedEdgesIds: string[];
}

export type LadderStoreSetFunction = (
	partial:
		| LadderStoreState
		| Partial<LadderStoreState>
		| ((partial: Partial<LadderStoreState>) => LadderStoreState | Partial<LadderStoreState>),
) => void;

export type LadderStoreGetFunction = () => LadderStoreState;

export const createLadderStore = (ladder: Ladder, commandsStack: CommandsStack<Ladder>) => {
	return createStore<LadderStoreState>((set, get) => ({
		initialLadder: ladder?.copy(),
		ladder,

		//=============== VIEW (canevas) ===============
		nodesBySectionId: Object.fromEntries(
			ladder.sections.map((section) => [section.id, LadderNodesFactory.getInitialNodes(section)]),
		),
		edgesBySectionId: Object.fromEntries(
			ladder.sections.map((section) => [section.id, LadderEdgesFactory.getInitialEdges(section)]),
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
		commandsStackManager: new CommandsStackManager(set, get, commandsStack),
		copyCutPasteManager: new CopyCutPasteManager(set, get),

		//=============== VIEW (zoom) ===============
		zoom: 1,
		viewManager: new ViewManager(set, get),

		highlightedNodesIds: [],
		highlightedEdgesIds: [],
	}));
};
