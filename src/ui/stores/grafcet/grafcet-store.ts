import Grafcet from "@/schemas/grafcet/Grafcet.class";
import { createStore } from "zustand";
import EdgesFactory from "./factories/EdgesFactory";
import NodesFactory from "./factories/NodesFactory.class";
import { GrafcetStoreState } from "./grafcet-store-types";
import CommandsStackManager from "./managers/CommandsStackManager.class";
import CopyCutPasteManager from "./managers/CopyCutPasteManager";
import ViewManager from "./managers/ViewManager";
import WorkflowManager from "./managers/WorkflowManager";

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
