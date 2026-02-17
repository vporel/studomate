import AbstractCommand from "@/schemas/commands/AbstractCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import { GrafcetConnectionData } from "@/schemas/grafcet/GrafcetConnection.class";
import { NodeChange, ReactFlowInstance, Connection as XYFlowConnection } from "@xyflow/react";
import { GrafcetEdgeType, GrafcetNodeType } from "../../components/grafcet/flow/grafcet-nodes-definitions";

/**
 * The methods starting with "on" are meant to be used as event handlers for the ReactFlow component,
 * they will update the grafcet state by executing the corresponding commands
 * but will not affect the commands stack (no undo/redo for these operations).
 */

export interface GrafcetStoreState {
	initialGrafcet?: Grafcet; //The initial grafcet, used as reference
	grafcet: Grafcet;
	/**
	 * The instance should not be used to set the nodes and edges,
	 * but only to get the flow state
	 * The nodes and edges lists are managed by the store
	 */
	rfInstance: ReactFlowInstance | null;
	nodes: GrafcetNodeType[];
	edges: GrafcetEdgeType[];

	setReactFlowInstance: (instance: ReactFlowInstance) => void;
	getNodes: () => GrafcetNodeType[];
	addNodes: (newNodes: GrafcetNodeType[]) => void;
	deleteNodes: (nodeIds: string[]) => void;
	onNodesChange: (changes: NodeChange<GrafcetNodeType>[]) => void;
	updateNodeData: (
		nodeId: string,
		newData:
			| Partial<GrafcetNodeType["data"]>
			| ((prevData: GrafcetNodeType["data"]) => Partial<GrafcetNodeType["data"]>),
	) => void;

	getEdges: () => GrafcetEdgeType[];
	onConnect: (connection: XYFlowConnection) => void;
	deleteEdges: (edgeIds: string[]) => void;

	//This function only update the schema
	updateEdgeData: (
		edgeId: string,
		newData:
			| Partial<GrafcetConnectionData>
			| ((prevData: GrafcetConnectionData) => Partial<GrafcetConnectionData>),
	) => void;

	selectAllEdges: () => void;
	selectAllNodesAndEdges: () => void;

	//Operations stack management
	/**
	 * Execute a list of commands, add them to the stack and update the grafcet state
	 */
	executeOperation: (commands: AbstractCommand<Grafcet>[]) => void; // Executes a list of commands and adds them to the stack
	/**
	 * Undo the last operation (list of commands) and update the grafcet state
	 */
	undoOperation: () => void; // Returns the list of commands that were undone, or null if no operation to undo
	/**
	 * Redo the last undone operation (list of commands) and update the grafcet state
	 */
	redoOperation: () => void; // Returns the list of commands that were redone, or null if no operation to redo
}

export type GrafcetStoreSetFunction = (
	partial:
		| GrafcetStoreState
		| Partial<GrafcetStoreState>
		| ((partial: Partial<GrafcetStoreState>) => GrafcetStoreState | Partial<GrafcetStoreState>),
) => void;
