import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { createStore } from "zustand";
import { GrafcetEdgeType, GrafcetNodeType } from "../../components/grafcet/flow/grafcet-nodes-definitions";
import EdgesFactory from "./factories/edges.factory";
import NodesFactory from "./factories/nodes.factory";
import CommandsStackManager from "./managers/commands-stack.manager";
import CopyCutPasteManager from "./managers/copy-cut-paste.manager";
import ViewManager from "./managers/view.manager";
import WorkflowManager from "./managers/workflow.manager";

export interface GrafcetStoreState {
	initialGrafcet?: Grafcet; //The initial grafcet, used as reference
	grafcet: Grafcet;
	nodes: GrafcetNodeType[];
	edges: GrafcetEdgeType[];

	viewManager: ViewManager;
	workflowManager: WorkflowManager;
	copyCutPasteManager: CopyCutPasteManager;

	//=============== COMMANDS STACK ===============
	hasCommandsToUndo: boolean;
	hasCommandsToRedo: boolean;
	commandsStackManager: CommandsStackManager;
}

export type GrafcetStoreSetFunction = (
	partial:
		| GrafcetStoreState
		| Partial<GrafcetStoreState>
		| ((partial: Partial<GrafcetStoreState>) => GrafcetStoreState | Partial<GrafcetStoreState>),
) => void;

export type GrafcetStoreGetFunction = () => GrafcetStoreState;

export const createGrafcetStore = (grafcet: Grafcet) => {
	return createStore<GrafcetStoreState>((set, get) => ({
		initialGrafcet: grafcet?.copy(), //Should never be modified, used as reference
		grafcet: grafcet,
		nodes: NodesFactory.getInitialNodes(grafcet),
		edges: EdgesFactory.getInitialEdges(grafcet),

		viewManager: new ViewManager(set, get),
		workflowManager: new WorkflowManager(set, get),
		copyCutPasteManager: new CopyCutPasteManager(set, get),

		//=============== COMMANDS STACK ===============
		hasCommandsToUndo: false,
		hasCommandsToRedo: false,
		commandsStackManager: new CommandsStackManager(set, get),
	}));
};
