import { Dialect } from "@/expression-language/dialect.enum";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { createStore } from "zustand";
import {
	GrafcetEdgeType,
	GrafcetNodeType,
} from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import EdgesFactory from "./factories/edges.factory";
import NodesFactory from "./factories/nodes.factory";
import GrafcetCommandsStackManager from "./managers/commands-stack.manager";
import GrafcetCopyCutPasteManager from "./managers/copy-cut-paste.manager";
import GrafcetViewManager from "./managers/view.manager";
import GrafcetWorkflowManager from "./managers/workflow.manager";

export interface GrafcetStoreState {
	/**
	 * Dialecte des expressions, lu à la demande auprès du projet : le stocker en copie le
	 * laisserait périmé si l'utilisateur change le dialecte du projet.
	 */
	getDialect: () => Dialect;
	initialGrafcet?: Grafcet; //The initial grafcet, used as reference
	grafcet: Grafcet;
	//=============== VIEW ===============
	nodes: GrafcetNodeType[];
	edges: GrafcetEdgeType[];
	/**
	 * The ids of the currently highlighted nodes
	 * Can be used to highlight the elements that have issues after an analysis
	 */
	highlightedNodesIds: string[];
	highlightedEdgesIds: string[];
	viewManager: GrafcetViewManager;
	copyCutPasteManager: GrafcetCopyCutPasteManager;

	workflowManager: GrafcetWorkflowManager;

	//=============== COMMANDS STACK ===============
	hasCommandsToUndo: boolean;
	hasCommandsToRedo: boolean;
	commandsStackManager: GrafcetCommandsStackManager;
}

export type GrafcetStoreSetFunction = (
	partial:
		| GrafcetStoreState
		| Partial<GrafcetStoreState>
		| ((
				state: GrafcetStoreState,
		  ) => GrafcetStoreState | Partial<GrafcetStoreState>),
) => void;

export type GrafcetStoreGetFunction = () => GrafcetStoreState;

export const createGrafcetStore = (
	grafcet: Grafcet,
	commandsStack: CommandsStack<Grafcet>,
	getDialect: () => Dialect,
) => {
	return createStore<GrafcetStoreState>((set, get) => ({
		getDialect,
		initialGrafcet: grafcet?.copy(), //Should never be modified, used as reference
		grafcet: grafcet,

		//=============== VIEW ===============
		nodes: NodesFactory.getInitialNodes(grafcet),
		edges: EdgesFactory.getInitialEdges(grafcet),
		highlightedNodesIds: [],
		highlightedEdgesIds: [],
		viewManager: new GrafcetViewManager(set, get),
		copyCutPasteManager: new GrafcetCopyCutPasteManager(set, get),

		workflowManager: new GrafcetWorkflowManager(set, get),

		//=============== COMMANDS STACK ===============
		//Read from the stack, not hardcoded: the history survives the page being closed,
		//so reopening a grafcet must show the undo/redo buttons as still available
		hasCommandsToUndo: commandsStack.commandsToUndo.length > 0,
		hasCommandsToRedo: commandsStack.commandsToRedo.length > 0,
		commandsStackManager: new GrafcetCommandsStackManager(
			set,
			get,
			commandsStack,
		),
	}));
};
