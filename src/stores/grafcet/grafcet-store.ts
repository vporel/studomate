import { GrafcetEdge, GrafcetNode } from "@/components/grafcet/flow/grafcet-nodes-definitions";
import CommandsStack from "@/schemas/commands/CommandsStack.class";
import ConnectionsAddCommand from "@/schemas/grafcet/commands/ConnectionsAddCommand.class";
import ConnectionsRemoveCommand from "@/schemas/grafcet/commands/ConnectionsRemoveCommand.class";
import ConnectionsUpdateCommand from "@/schemas/grafcet/commands/ConnectionsUpdateCommand.class";
import ElementsAddCommand from "@/schemas/grafcet/commands/ElementsAddCommand.class";
import ElementsRemoveCommand from "@/schemas/grafcet/commands/ElementsRemoveCommand.class";
import ElementsUpdateCommand from "@/schemas/grafcet/commands/ElementsUpdateCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import GrafcetConnection, { GrafcetConnectionData } from "@/schemas/grafcet/GrafcetConnection.class";
import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import { createElementId } from "@/schemas/schemas-helpers";
import { grafcetConnectionFromXYFlowConnection } from "@/utils/grafcet/grafcet-utils";
import { addEdge, ReactFlowInstance, Connection as XYFlowConnection } from "@xyflow/react";
import { createStore } from "zustand";
import { commandRedo, commandUndo } from "./commands";
import { GrafcetStoreState } from "./grafcet-store-types";

const COMMANDS_STACK_SIZE = 100;

export const createGrafcetStore = (grafcet: Grafcet) => {
	const commandsStack: CommandsStack<Grafcet> = new CommandsStack<Grafcet>(COMMANDS_STACK_SIZE);

	return createStore<GrafcetStoreState>((set, get) => ({
		initialGrafcet: grafcet?.copy(), //Should never be modified, used as reference
		grafcet: grafcet,
		rfInstance: null,

		setReactFlowInstance: (instance: ReactFlowInstance) => set({ rfInstance: instance }),

		getNodes: () => {
			const rfInstance = get().rfInstance;
			return (rfInstance ? rfInstance.getNodes() : []) as GrafcetNode[];
		},

		addNodes: (newNodes: GrafcetNode[]) => {
			const rfInstance = get().rfInstance;
			if (rfInstance) {
				const existingNodes = rfInstance.getNodes();
				for (const newNode of newNodes) {
					if (!existingNodes.find((n) => n.id === newNode.id)) {
						rfInstance.addNodes(newNode);
					}
				}
				get().executeOperation([
					new ElementsAddCommand(
						newNodes.map((node) => ({
							type: node.type,
							id: node.id,
							data: node.data,
							position: node.position,
						})),
					),
				]);
			}
		},

		deleteNodes: (nodesIds: string[]) => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			const grafcet = get().grafcet;
			const connections: GrafcetConnection[] = grafcet.connections.filter(
				(c) => nodesIds.includes(c.source.id) || nodesIds.includes(c.target.id),
			);

			rfInstance.setNodes((nds) => nds.filter((n) => !nodesIds.includes(n.id)));
			rfInstance.setEdges((eds) => eds.filter((e) => !connections.find((c) => c.id === e.id)));
			get().executeOperation([
				new ElementsRemoveCommand(
					nodesIds
						.map((id) => rfInstance.getNode(id))
						.filter((n): n is GrafcetNode => !!n)
						.map((node) => ({
							type: node.type,
							id: node.id,
							data: node.data,
							position: node.position,
						})),
				),
				new ConnectionsRemoveCommand(connections),
			]);
		},

		onNodesPositionsChange: (nodesIds) => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			const grafcet = get().grafcet;
			const connections: GrafcetConnection[] = grafcet.connections.filter(
				(c) => nodesIds.includes(c.source.id) || nodesIds.includes(c.target.id),
			);
			const connectionsModified = connections.map((c) => c.copy());
			for (const c of connectionsModified) {
				const edge = rfInstance.getEdge(c.id);
				if (!edge) throw new Error("Edge not found for connection " + c.id);
				c.data = edge.data as any;
			}
			get().executeOperation([
				new ElementsUpdateCommand(
					nodesIds
						.map((id) => rfInstance.getNode(id))
						.filter((n): n is GrafcetNode => !!n)
						.map((e) => ({
							type: e.type,
							id: e.id,
							data: e.data,
							position: e.position,
							previousData: e.data ? grafcet.getElement(e.type, e.id)?.data || {} : undefined,
							previousPosition: e.position
								? grafcet.getElement(e.type, e.id)?.position || {
										x: 0,
										y: 0,
									}
								: undefined,
						})),
				),

				new ConnectionsUpdateCommand(
					(connectionsModified || []).map((c) => {
						const previous = grafcet.getConnection(c.source.id, c.target.id);
						if (!previous) throw new Error("Previous connection not found");
						return { connection: c, previous };
					}),
				),
			]);
		},

		updateNodeData: (nodeId, newData) => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			const grafcet = get().grafcet;
			rfInstance.updateNodeData(nodeId, newData);
			const node = rfInstance.getNode(nodeId);
			if (!node) return;
			rfInstance.setNodes((nds) =>
				nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n)),
			);
			const grafcetNode = grafcet.getElement(node.type as GrafcetElementType, node.id);
			if (!grafcetNode) return;
			const modifiedNode = {
				...grafcetNode,
				data: { ...grafcetNode.data, ...newData },
			};
			get().executeOperation([
				new ElementsUpdateCommand([
					{
						id: node.id,
						type: node.type as GrafcetElementType,
						data: modifiedNode.data,
						position: node.position,
						previousData: grafcetNode.data,
						previousPosition: grafcetNode.position,
					},
				]),
			]);
		},

		getEdges: () => {
			const rfInstance = get().rfInstance;
			return (rfInstance ? rfInstance.getEdges() : []) as GrafcetEdge[];
		},

		onConnect: (connection: XYFlowConnection) => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			const connectionId = createElementId();
			rfInstance.setEdges((edgesSnapshot) =>
				addEdge({ ...connection, id: connectionId }, edgesSnapshot),
			);
			const grafcetConnection = grafcetConnectionFromXYFlowConnection(
				rfInstance,
				connection,
				connectionId,
			);
			if (!grafcetConnection) return;
			get().executeOperation([new ConnectionsAddCommand([grafcetConnection])]);
		},

		deleteEdges: (edgeIds: string[]) => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			rfInstance.setEdges((eds) => eds.filter((e) => !edgeIds.includes(e.id)));
			const grafcetConnections = edgeIds.map((id) =>
				get()
					.grafcet.connections.find((c) => c.id === id)!
					.copy(),
			);
			get().executeOperation([new ConnectionsRemoveCommand(grafcetConnections)]);
		},

		updateConnectionData: (connectionId: string, newData: Partial<GrafcetConnectionData>) => {
			const connection = get().grafcet.connections.find((c) => c.id === connectionId);
			if (!connection) return;
			const modifiedConnection = connection.copy();
			modifiedConnection.data = { ...modifiedConnection.data, ...newData };
			get().executeOperation([
				new ConnectionsUpdateCommand([
					{
						connection: modifiedConnection,
						previous: connection.copy(),
					},
				]),
			]);
		},

		selectAllEdges: () => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			rfInstance.setEdges((eds) => eds.map((e) => ({ ...e, selected: true })));
		},

		selectAllNodesAndEdges: () => {
			const rfInstance = get().rfInstance;
			if (!rfInstance) return;
			rfInstance.setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
			rfInstance.setEdges((eds) => eds.map((e) => ({ ...e, selected: true })));
		},

		executeOperation: (commands) => {
			const newGrafcet = commandsStack.execute(commands, get().grafcet.copy());
			set(() => ({ grafcet: newGrafcet }));
		},

		undoOperation: () => {
			const [newGrafcet, commands] = commandsStack.undo(get().grafcet.copy());
			if (!commands) return;
			set(() => ({ grafcet: newGrafcet }));
			commands?.forEach((command) => commandUndo(get().rfInstance!, command));
		},

		redoOperation: () => {
			const [newGrafcet, commands] = commandsStack.redo(get().grafcet.copy());
			if (!commands) return;
			set(() => ({ grafcet: newGrafcet }));
			commands?.forEach((command) => commandRedo(get().rfInstance!, command));
		},
	}));
};
