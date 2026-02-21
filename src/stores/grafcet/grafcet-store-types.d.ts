import AbstractCommand from "@/schemas/commands/AbstractCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import { EdgeChange, NodeChange, ReactFlowInstance, Connection as XYFlowConnection } from "@xyflow/react";
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
	getZoom: () => number;
	zoomIn: () => void;
	zoomOut: () => void;
	fitView: () => void;
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
	addEdges: (newEdges: GrafcetEdgeType[]) => void;
	onConnect: (connection: XYFlowConnection) => void;
	onEdgesChange: (changes: EdgeChange<GrafcetEdgeType>[]) => void;
	deleteEdges: (edgeIds: string[]) => void;
	//This function only update the schema
	updateEdgeData: (
		edgeId: string,
		newData:
			| Partial<GrafcetEdgeType["data"]>
			| ((prevData: GrafcetEdgeType["data"]) => Partial<GrafcetEdgeType["data"]>),
	) => void;

	/**
	 * Used when whe don't to have separate calls to add nodes and edges, for example when pasting elements, to avoid multiple updates of the grafcet state
	 */
	addNodesAndEdges: (newNodes: GrafcetNodeType[], newEdges: GrafcetEdgeType[]) => void; //Helper to add nodes and edges at the same time, for example when pasting elements
	deleteNodesAndEdges: (nodeIds: string[], edgeIds: string[]) => void; //To delete nodes and edges at the same time, for example when deleting a selection

	selectAllEdges: () => void;
	selectAllNodesAndEdges: () => void;
	deselectAllNodesAndEdges: () => void;

	copySelectedElements: () => void;
	pasteCopiedElements: (mousePosition?: { x: number; y: number }) => void;

	//=============== COMMANDS STACK ===============
	hasCommandsToUndo: boolean;
	hasCommandsToRedo: boolean;
	/**
	 * Execute a list of commands, add them to the stack and update the grafcet state
	 */
	executeOperation: (commands: AbstractCommand<Grafcet, any>[]) => void; // Executes a list of commands and adds them to the stack
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
