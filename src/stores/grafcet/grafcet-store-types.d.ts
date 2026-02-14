import AbstractCommand from "@/schemas/commands/AbstractCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import { GrafcetConnectionData } from "@/schemas/grafcet/GrafcetConnection.class";
import { ReactFlowInstance, Connection as XYFlowConnection } from "@xyflow/react";
import { GrafcetEdge, GrafcetNode } from "../../components/grafcet/flow/grafcet-nodes-definitions";

/**
 * The methods starting with "on" are meant to be used as event handlers for the ReactFlow component,
 * they will update the grafcet state by executing the corresponding commands
 * but will not affect the commands stack (no undo/redo for these operations).
 */

export interface GrafcetStoreState {
	initialGrafcet?: Grafcet; //The initial grafcet, used as reference
	grafcet: Grafcet;
	rfInstance: ReactFlowInstance | null;

	setReactFlowInstance: (instance: ReactFlowInstance) => void;
	getNodes: () => GrafcetNode[];
	addNodes: (newNodes: GrafcetNode[]) => void;
	deleteNodes: (nodeIds: string[]) => void;
	onNodesPositionsChange: (nodesIds: string[]) => void;
	updateNodeData: (nodeId: string, newData: Partial<GrafcetNode["data"]>) => void;

	getEdges: () => GrafcetEdge[];
	onConnect: (connection: XYFlowConnection) => void;
	deleteEdges: (edgeIds: string[]) => void;

	//This function only update the schema
	updateConnectionData: (connectionId: string, newData: Partial<GrafcetConnectionData>) => void;

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
