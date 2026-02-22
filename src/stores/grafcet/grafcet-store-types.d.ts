import Grafcet from "@/schemas/grafcet/Grafcet.class";
import { GrafcetEdgeType, GrafcetNodeType } from "../../components/grafcet/flow/grafcet-nodes-definitions";
import CommandsStackManager from "./managers/CommandsStackManager.class";
import ViewManager from "./managers/ViewManager";
import WorkflowManager from "./managers/WorkflowManager";

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
