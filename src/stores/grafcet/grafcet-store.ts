import { GrafcetEdgeType, GrafcetNodeType } from "@/components/grafcet/flow/grafcet-nodes-definitions";
import CommandsStack from "@/schemas/commands/CommandsStack.class";
import ConnectionsAddCommand from "@/schemas/grafcet/commands/ConnectionsAddCommand.class";
import ConnectionsRemoveCommand from "@/schemas/grafcet/commands/ConnectionsRemoveCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import GrafcetConnection, { GrafcetConnectionData } from "@/schemas/grafcet/GrafcetConnection.class";
import { createElementId } from "@/schemas/schemas-helpers";
import { grafcetConnectionFromXYFlowConnectionOrEdge } from "@/utils/grafcet/grafcet-utils";
import { addEdge, applyNodeChanges, ReactFlowInstance, Connection as XYFlowConnection } from "@xyflow/react";
import { createStore } from "zustand";
import { commandRedo, commandUndo } from "./commands-undo-redo";
import {
	getEdgesUpdateCommandsWhenNodesMovedOrResized,
	getInitialEdges,
	handleEdgeDataChange,
} from "./edges-management";
import { focusFlow } from "./flow-management";
import { GrafcetStoreSetFunction, GrafcetStoreState } from "./grafcet-store-types";
import { junction_onNodeChange } from "./junction-node-management";
import {
	getInitialNodes,
	getNodeDimensionsChangeCommands,
	getNodePositionChangeCommands,
	handleNodeDataChange,
	handleNodesAdd,
	handleNodesDelete,
} from "./nodes-management";

const COMMANDS_STACK_SIZE = 100;

export const createGrafcetStore = (grafcet: Grafcet) => {
	const commandsStack: CommandsStack<Grafcet> = new CommandsStack<Grafcet>(COMMANDS_STACK_SIZE);

	const getNodesUpdater = (set: GrafcetStoreSetFunction) => {
		return (updater: (nodes: any[]) => any[]) => {
			set((state) => {
				const newNodes = updater(state.nodes!);
				return { nodes: newNodes };
			});
		};
	};

	const getNodeUpdater = (set: GrafcetStoreSetFunction) => {
		return (nodeId: string, updater: (node: any) => any) => {
			set((state) => {
				const newNodes = state.nodes!.map((n) => {
					if (n.id === nodeId) return { ...n, ...updater(n) };
					return n;
				});
				return { nodes: newNodes };
			});
		};
	};

	const getEdgesUpdater = (set: GrafcetStoreSetFunction) => {
		return (updater: (edges: any[]) => any[]) => {
			set((state) => {
				const newEdges = updater(state.edges!);
				return { edges: newEdges };
			});
		};
	};

	return createStore<GrafcetStoreState>((set, get) => ({
		initialGrafcet: grafcet?.copy(), //Should never be modified, used as reference
		grafcet: grafcet,
		rfInstance: null,
		nodes: getInitialNodes(grafcet),
		edges: getInitialEdges(grafcet),

		setReactFlowInstance: (instance: ReactFlowInstance) => set({ rfInstance: instance }),

		getNodes: () => {
			const rfInstance = get().rfInstance;
			return (rfInstance ? rfInstance.getNodes() : []) as GrafcetNodeType[];
		},

		addNodes: (newNodes: GrafcetNodeType[]) => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			const grafcet = get().grafcet;
			const commands = handleNodesAdd(rfInstance, grafcet, getNodesUpdater(set), newNodes);
			get().executeOperation(commands);
			focusFlow(grafcet.id);
		},

		deleteNodes: (nodesIds: string[]) => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			const grafcet = get().grafcet;
			const commands = handleNodesDelete(
				rfInstance,
				grafcet,
				getNodesUpdater(set),
				getEdgesUpdater(set),
				nodesIds,
			);
			get().executeOperation(commands);
			focusFlow(grafcet.id);
		},

		onNodesChange: (changes) => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			changes.forEach((change) => {
				const node = get().nodes?.find((n) => n.id === (change as any).id);
				if (!node) return;
				if (node.type.includes("junction")) {
					junction_onNodeChange(change, changes, get().nodes!, getNodeUpdater(set));
				}
			});
			set(() => ({
				nodes: applyNodeChanges(changes, get().nodes!),
			}));
			//Execute commands on for some changes types
			//The others types are handled by other methods
			const grafcet = get().grafcet;
			const commands: any[] = [];
			//If the cahcnges contain a resizing change with resizing true
			//we don't execute the position change command, because the position will be updated during the resizing and we want to avoid creating unnecessary commands
			if (changes.some((c) => c.type === "dimensions" && c.resizing)) return;
			const nodesIdsToUpdateConnections: Set<string> = new Set();
			changes.forEach((change) => {
				switch (change.type) {
					case "position": {
						if (change.dragging) break;
						const _commands = getNodePositionChangeCommands(rfInstance, grafcet, change.id);
						commands.push(..._commands);
						if (_commands.length > 0) nodesIdsToUpdateConnections.add(change.id);
						break;
					}
					case "dimensions": {
						if (change.resizing) break;
						const _commands = getNodeDimensionsChangeCommands(rfInstance, grafcet, change.id);
						commands.push(..._commands);
						if (_commands.length > 0) nodesIdsToUpdateConnections.add(change.id);
						break;
					}
				}
			});
			commands.push(
				...getEdgesUpdateCommandsWhenNodesMovedOrResized(
					rfInstance,
					grafcet,
					getEdgesUpdater(set),
					Array.from(nodesIdsToUpdateConnections),
				),
			);
			get().executeOperation(commands);
		},

		updateNodeData: (nodeId, newData) => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			const grafcet = get().grafcet;
			const commands = handleNodeDataChange(rfInstance, grafcet, nodeId, newData);
			get().executeOperation(commands);
		},

		getEdges: () => {
			const rfInstance = get().rfInstance;
			return (rfInstance ? rfInstance.getEdges() : []) as GrafcetEdgeType[];
		},

		onConnect: (connection: XYFlowConnection) => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			const connectionId = createElementId();
			const edges = get().edges;
			const grafcetConnection = grafcetConnectionFromXYFlowConnectionOrEdge(
				rfInstance,
				connection,
				connectionId,
			)!;
			set(() => ({
				edges: addEdge({ ...connection, id: connectionId, data: grafcetConnection.data }, edges),
			}));
			get().executeOperation([new ConnectionsAddCommand([grafcetConnection])]);
		},

		deleteEdges: (edgeIds: string[]) => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			const grafcet = get().grafcet;
			const edges = get().edges;
			set(() => ({ edges: edges.filter((e) => !edgeIds.includes(e.id)) }));
			const commands = [
				new ConnectionsRemoveCommand(
					edgeIds
						.map((id) => grafcet.connections.find((c) => c.id === id)?.copy())
						.filter((c) => c !== undefined) as GrafcetConnection[],
				),
			];
			get().executeOperation(commands);
			focusFlow(grafcet.id);
		},

		updateEdgeData: (edgeId: string, newData: Partial<GrafcetConnectionData>) => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			const grafcet = get().grafcet;
			const commands = handleEdgeDataChange(rfInstance, grafcet, getEdgesUpdater(set), edgeId, newData);
			get().executeOperation(commands);
		},

		selectAllEdges: () => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			set((state) => ({ edges: state.edges.map((e) => ({ ...e, selected: true })) }));
		},

		selectAllNodesAndEdges: () => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			set((state) => ({ nodes: state.nodes.map((n) => ({ ...n, selected: true })) }));
			set((state) => ({ edges: state.edges.map((e) => ({ ...e, selected: true })) }));
		},

		executeOperation: (commands) => {
			if (!commands || commands.length === 0) return;
			console.log("Executing grafcet operation with commands: ", commands);
			const newGrafcet = commandsStack.execute(commands, get().grafcet.copy());
			set(() => ({ grafcet: newGrafcet }));
		},

		undoOperation: () => {
			const [newGrafcet, commands] = commandsStack.undo(get().grafcet.copy());
			if (!commands) return;
			set(() => ({ grafcet: newGrafcet }));
			commands?.forEach((command) =>
				commandUndo(get().rfInstance!, getNodesUpdater(set), getEdgesUpdater(set), command),
			);
		},

		redoOperation: () => {
			const [newGrafcet, commands] = commandsStack.redo(get().grafcet.copy());
			if (!commands) return;
			set(() => ({ grafcet: newGrafcet }));
			commands?.forEach((command) =>
				commandRedo(get().rfInstance!, getNodesUpdater(set), getEdgesUpdater(set), command),
			);
		},
	}));
};
