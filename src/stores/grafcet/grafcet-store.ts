import { GrafcetEdgeType, GrafcetNodeType } from "@/components/grafcet/flow/grafcet-nodes-definitions";
import CommandsStack from "@/schemas/commands/CommandsStack.class";
import ConnectionsAddCommand from "@/schemas/grafcet/commands/ConnectionsAddCommand.class";
import ConnectionsRemoveCommand from "@/schemas/grafcet/commands/ConnectionsRemoveCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import GrafcetConnection from "@/schemas/grafcet/GrafcetConnection.class";
import { createRandomId } from "@/schemas/schemas-helpers";
import { grafcetConnectionFromXYFlowConnectionOrEdge } from "@/utils/grafcet/grafcet-utils";
import {
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	ReactFlowInstance,
	Connection as XYFlowConnection,
} from "@xyflow/react";
import { createStore } from "zustand";
import { commandRedo, commandUndo } from "./commands-undo-redo";
import CopyCutPasteManager from "./CopyCutPasteManager";
import EdgesFactory from "./EdgesFactory";
import { focusFlow } from "./flow-management";
import { GrafcetStoreSetFunction, GrafcetStoreState } from "./grafcet-store-types";
import GrafcetConnectionsCommandsFactory from "./GrafcetConnectionsCommandsFactory.class";
import GrafcetElementsCommandsFactory from "./GrafcetElementsCommandsFactory.class";
import { junction_onNodeChange } from "./junction-node-management";
import NodesFactory from "./NodesFactory.class";

const COMMANDS_STACK_SIZE = 100;

export const createGrafcetStore = (grafcet: Grafcet) => {
	const _commandsStack: CommandsStack<Grafcet> = new CommandsStack<Grafcet>(COMMANDS_STACK_SIZE);
	const _elementsCmdsFactory = new GrafcetElementsCommandsFactory(null as any, grafcet); //We will set the rfInstance later, when we have it
	const _connectionsCmdsFactory = new GrafcetConnectionsCommandsFactory(null as any, grafcet); //We will set the rfInstance later, when we have it
	const _copyCutPasteManager = new CopyCutPasteManager(null as any, grafcet); //We will set the rfInstance later, when we have it

	const _setGrafcet = (set: GrafcetStoreSetFunction, newGrafcet: Grafcet) => {
		set({
			grafcet: newGrafcet,
			hasCommandsToUndo: _commandsStack.commandsToUndo.length > 0,
			hasCommandsToRedo: _commandsStack.commandsToRedo.length > 0,
		});
		_elementsCmdsFactory.grafcet = newGrafcet;
		_connectionsCmdsFactory.grafcet = newGrafcet;
		_copyCutPasteManager.grafcet = newGrafcet;
	};

	const _getNodesUpdater = (set: GrafcetStoreSetFunction) => {
		return (updater: (nodes: any[]) => any[]) => {
			set((state) => {
				const newNodes = updater(state.nodes!);
				return { nodes: newNodes };
			});
		};
	};

	const _getNodeUpdater = (set: GrafcetStoreSetFunction) => {
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

	const _getEdgesUpdater = (set: GrafcetStoreSetFunction) => {
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
		nodes: NodesFactory.getInitialNodes(grafcet),
		edges: EdgesFactory.getInitialEdges(grafcet),

		setReactFlowInstance: (instance: ReactFlowInstance) => {
			set({ rfInstance: instance });
			_elementsCmdsFactory.rfInstance = instance;
			_connectionsCmdsFactory.rfInstance = instance;
			_copyCutPasteManager.rfInstance = instance;
		},

		getZoom: () => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return 1;
			return rfInstance.getZoom();
		},

		zoomIn: () => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			rfInstance.zoomIn();
		},

		zoomOut: () => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			rfInstance.zoomOut();
		},

		fitView: () => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			rfInstance.fitView();
		},

		getNodes: () => {
			const rfInstance = get().rfInstance;
			return (rfInstance ? rfInstance.getNodes() : []) as GrafcetNodeType[];
		},

		addNodes: (newNodes: GrafcetNodeType[]) => {
			if (!get().rfInstance) return;
			const { commands, nodesToAdd } = _elementsCmdsFactory.onNodesAdd(newNodes);
			set((state) => ({ nodes: [...state.nodes!, ...nodesToAdd] }));
			get().executeOperation(commands);
		},

		deleteNodes: (nodesIds: string[]) => {
			if (!get().rfInstance) return;
			const { commands, nodesIdsToDelete, edgesIdsToDelete } =
				_elementsCmdsFactory.onNodesRemove(nodesIds);
			set((state) => ({
				nodes: state.nodes!.filter((n) => !nodesIdsToDelete.includes(n.id)),
				edges: state.edges!.filter((e) => !edgesIdsToDelete.includes(e.id)),
			}));
			get().executeOperation(commands);
		},

		onNodesChange: (changes) => {
			if (!get().rfInstance) return;
			changes.forEach((change) => {
				const node = get().nodes?.find((n) => n.id === (change as any).id);
				if (!node) return;
				if (node.type.includes("junction")) {
					junction_onNodeChange(change, changes, get().nodes!, _getNodeUpdater(set));
				}
			});
			set(() => ({
				nodes: applyNodeChanges(changes, get().nodes!),
			}));
			//Execute commands on for some changes types
			//The others types are handled by other methods
			//If the changes contain a resizing change with resizing true
			//we don't execute the position change command, because the position will be updated during the resizing and we want to avoid creating unnecessary commands
			if (changes.some((c) => c.type === "dimensions" && c.resizing)) return;
			const { commands, nodesIdsToUpdate } = _elementsCmdsFactory.onNodeChange(changes);
			const { commands: edgesCommands, edgesDataToApply: edgesDataToUpdate } =
				_connectionsCmdsFactory.onNodesMovedOrResized(Array.from(nodesIdsToUpdate));
			if (edgesDataToUpdate.length > 0) {
				set(({ edges }) => ({
					edges: edges!.map((e) => {
						const edgeToUpdate = edgesDataToUpdate.find((edu) => edu.edgeId === e.id);
						if (edgeToUpdate && edgeToUpdate.newData)
							return { ...e, data: { ...e.data, ...edgeToUpdate.newData } };
						return e;
					}),
				}));
			}
			commands.push(...edgesCommands);
			get().executeOperation(commands);
		},

		updateNodeData: (nodeId, newData) => {
			if (!get().rfInstance) return;
			const { commands, nodeDataToUpdate } = _elementsCmdsFactory.onNodeDataChange(nodeId, newData);
			const setNode = _getNodeUpdater(set);
			setNode(nodeId, (n) => ({ ...n, data: { ...n.data, ...nodeDataToUpdate } }) as GrafcetNodeType);
			get().executeOperation(commands);
		},

		getEdges: () => {
			return get().edges;
		},

		addEdges: (newEdges: GrafcetEdgeType[]) => {
			if (!get().rfInstance) return;
			const { commands, edgesToAdd } = _connectionsCmdsFactory.onEdgesAdd(newEdges, get().nodes!);
			set((state) => ({ edges: [...state.edges!, ...edgesToAdd] }));
			get().executeOperation(commands);
			focusFlow(grafcet.id);
		},

		onConnect: (connection: XYFlowConnection) => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			const connectionId = createRandomId();
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

		onEdgesChange: (changes) => {
			if (!get().rfInstance) return;
			set(() => ({
				edges: applyEdgeChanges(changes, get().edges!),
			}));
		},

		deleteEdges: (edgeIds: string[]) => {
			if (!get().rfInstance) return;
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

		updateEdgeData: (edgeId: string, newData) => {
			if (!get().rfInstance) return;
			const { commands, edgeDataToApply: newDataToApply } = _connectionsCmdsFactory.onEdgeDataChange(
				_getEdgesUpdater(set),
				edgeId,
				newData,
			);
			if (commands.length > 0) {
				set(({ edges }) => ({
					edges: edges!.map((e) =>
						e.id === edgeId ? { ...e, data: { ...e.data, ...(newDataToApply as any) } } : e,
					),
				}));
			}
			get().executeOperation(commands);
		},

		addNodesAndEdges: (newNodes, newEdges) => {
			if (!get().rfInstance) return;
			const { commands: nodesCommands, nodesToAdd } = _elementsCmdsFactory.onNodesAdd(newNodes);
			const { commands: edgesCommands, edgesToAdd } = _connectionsCmdsFactory.onEdgesAdd(
				newEdges,
				nodesToAdd,
			);
			set((state) => ({
				nodes: [...state.nodes!, ...nodesToAdd],
				edges: [...state.edges!, ...edgesToAdd],
			}));
			get().executeOperation([...nodesCommands, ...edgesCommands]);
		},

		deleteNodesAndEdges: (nodesIds: string[], edgesIds: string[]) => {
			if (!get().rfInstance) return;
			const { commands: commandsFromNodes, edgesIdsToDelete: list1EdgesIdsToDelete } =
				_elementsCmdsFactory.onNodesRemove(nodesIds);
			const { commands: commandsFromEdges, edgesIdsToDelete: list2EdgesIdsToDelete } =
				_connectionsCmdsFactory.onEdgesRemove(
					edgesIds.filter((id) => !list1EdgesIdsToDelete.includes(id)),
				);
			set(({ edges }) => ({
				edges: edges.filter(
					(e) => ![...list1EdgesIdsToDelete, ...list2EdgesIdsToDelete].includes(e.id),
				),
			}));
			get().executeOperation([...commandsFromNodes, ...commandsFromEdges]);
		},

		selectAllEdges: () => {
			if (!get().rfInstance) return;
			set((state) => ({ edges: state.edges.map((e) => ({ ...e, selected: true })) }));
		},

		selectAllNodesAndEdges: () => {
			if (!get().rfInstance) return;
			set((state) => ({ nodes: state.nodes.map((n) => ({ ...n, selected: true })) }));
			set((state) => ({ edges: state.edges.map((e) => ({ ...e, selected: true })) }));
		},

		deselectAllNodesAndEdges: () => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			set((state) => ({
				nodes: state.nodes.map((n) => ({ ...n, selected: false })),
				edges: state.edges.map((e) => ({ ...e, selected: false })),
			}));
		},

		copySelectedElements: () => {
			if (!get().rfInstance) return;
			_copyCutPasteManager.copyElements(
				get().nodes.filter((n) => n.selected),
				get().edges.filter((e) => e.selected),
			);
		},

		pasteCopiedElements: (mousePosition) => {
			if (!_copyCutPasteManager.copiedElements) return;
			if (!get().rfInstance) return;
			get().deselectAllNodesAndEdges();
			const { nodesToAdd, edgesToAdd } = _copyCutPasteManager.pasteElements(mousePosition);
			get().addNodesAndEdges(nodesToAdd, edgesToAdd);
			focusFlow(get().grafcet.id);
		},

		//=============== COMMANDS STACK ===============
		/**
		 * The values of hasCommandsToUndo and hasCommandsToRedo
		 * are updated in the function _setGrafcet because that function
		 * is directly related to the commands stack operations
		 */
		hasCommandsToUndo: false,
		hasCommandsToRedo: false,
		executeOperation: (commands) => {
			if (!get().rfInstance) return;
			if (!commands || commands.length === 0) return;
			console.log("Executing grafcet operation with commands: ", commands);
			const newGrafcet = _commandsStack.execute(commands, get().grafcet.copy());
			_setGrafcet(set, newGrafcet);
		},

		undoOperation: () => {
			if (!get().rfInstance) return;
			const [newGrafcet, commands] = _commandsStack.undo(get().grafcet.copy());
			if (!commands) return;
			_setGrafcet(set, newGrafcet);
			commands?.forEach((command) =>
				commandUndo(get().rfInstance!, _getNodesUpdater(set), _getEdgesUpdater(set), command),
			);
		},

		redoOperation: () => {
			if (!get().rfInstance) return;
			const [newGrafcet, commands] = _commandsStack.redo(get().grafcet.copy());
			if (!commands) return;
			_setGrafcet(set, newGrafcet);
			commands?.forEach((command) =>
				commandRedo(get().rfInstance!, _getNodesUpdater(set), _getEdgesUpdater(set), command),
			);
		},
	}));
};
