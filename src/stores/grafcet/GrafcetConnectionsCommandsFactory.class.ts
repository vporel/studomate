import { CustomEdgeData } from "@/components/grafcet/edges/CustomEdge";
import { GrafcetEdgeType, GrafcetNodeType } from "@/components/grafcet/flow/grafcet-nodes-definitions";
import { deepObjectsComparison } from "@/lib/object";
import AbstractGrafcetCommand from "@/schemas/grafcet/commands/AbstractGrafcetCommand.class";
import ConnectionsAddCommand from "@/schemas/grafcet/commands/ConnectionsAddCommand.class";
import ConnectionsRemoveCommand from "@/schemas/grafcet/commands/ConnectionsRemoveCommand.class";
import ConnectionsUpdateCommand from "@/schemas/grafcet/commands/ConnectionsUpdateCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import GrafcetConnection from "@/schemas/grafcet/GrafcetConnection.class";
import { ReactFlowInstance } from "@xyflow/react";
import { ConnectionMode, getEdgePosition } from "@xyflow/system";

export default class GrafcetConnectionsCommandsFactory {
	rfInstance: ReactFlowInstance;
	grafcet: Grafcet;

	constructor(rfInstance: ReactFlowInstance, grafcet: Grafcet) {
		this.rfInstance = rfInstance;
		this.grafcet = grafcet;
	}

	/**
	 * @param newEdges
	 * @param nodes Needed to find the source and target nodes of the connections to add, to be able to create the corresponding data and commands
	 */
	onEdgesAdd(
		newEdges: GrafcetEdgeType[],
		nodes: GrafcetNodeType[],
	): {
		commands: AbstractGrafcetCommand<any>[];
		edgesToAdd: GrafcetEdgeType[];
	} {
		const existingEdges = this.rfInstance.getEdges();
		const edgesToAdd = newEdges.filter((e) => !existingEdges.find((ee) => ee.id === e.id));
		const commands = [];
		const connectionsToAdd = newEdges
			.map((edge) => {
				const sourceNode = nodes.find((n) => n.id === edge.source);
				const targetNode = nodes.find((n) => n.id === edge.target);
				if (!sourceNode || !targetNode) return null;
				return new GrafcetConnection(
					edge.id,
					{
						id: edge.source,
						type: sourceNode.type,
						handleId: edge.sourceHandle || "",
					},
					{
						id: edge.target,
						type: targetNode.type,
						handleId: edge.targetHandle || "",
					},
					edge.data!,
				);
			})
			.filter((c): c is GrafcetConnection => c !== null);
		if (connectionsToAdd.length > 0) {
			commands.push(new ConnectionsAddCommand(connectionsToAdd));
		}
		return {
			commands,
			edgesToAdd,
		};
	}

	onEdgesRemove(edgesIds: string[]): {
		commands: AbstractGrafcetCommand<any>[];
		edgesIdsToDelete: string[];
	} {
		const connectionsToRemove = this.grafcet.connections.filter((c) => edgesIds.includes(c.id));
		const commands = [];
		if (connectionsToRemove.length > 0) {
			commands.push(new ConnectionsRemoveCommand(connectionsToRemove.map((c) => c.copy())));
		}
		return {
			commands,
			edgesIdsToDelete: connectionsToRemove.map((c) => c.id),
		};
	}

	onEdgeDataChange(
		setEdges: (updater: (edges: GrafcetEdgeType[]) => any[]) => void,
		edgeId: string,
		newData:
			| Partial<GrafcetEdgeType["data"]>
			| ((prevData: GrafcetEdgeType["data"]) => Partial<GrafcetEdgeType["data"]>),
	): {
		commands: AbstractGrafcetCommand<any>[];
		edgeDataToApply: Partial<CustomEdgeData>;
	} {
		const edge = this.rfInstance.getEdge(edgeId);
		if (!edge) throw new Error("Edge not found in the flow instance");
		if (typeof newData === "function") {
			const prevData = edge.data as any;
			newData = newData(prevData);
		}
		if (!newData || Object.keys(newData).length === 0) return { commands: [], edgeDataToApply: {} }; //No need to update if the new data is empty
		const connection = this.grafcet.connections.find((c) => c.id === edgeId);
		if (!connection) throw new Error("Connection not found in the grafcet");
		const modifiedConnection = connection.copy();
		modifiedConnection.data = { ...modifiedConnection.data, ...newData };
		const commands = [];
		//Make sure to only create a command if the data has actually changed, to avoid creating unnecessary commands
		if (
			connection.data !== undefined &&
			!deepObjectsComparison(modifiedConnection.data, connection.data)
		) {
			commands.push(
				new ConnectionsUpdateCommand([
					{
						connection: modifiedConnection,
						previous: connection.copy(),
					},
				]),
			);
		}
		return { commands, edgeDataToApply: modifiedConnection.data! };
	}

	/**
	 * Commands to execute when nodes are moved or resized,
	 * to update the connections points accordingly
	 */
	onNodesMovedOrResized(nodesIds: string[]): {
		commands: AbstractGrafcetCommand<any>[];
		edgesDataToApply: { edgeId: string; newData: GrafcetEdgeType["data"] }[];
	} {
		if (nodesIds.length === 0) return { commands: [], edgesDataToApply: [] };
		const edgesDataToApply = this.grafcet.connections
			.filter((c) => nodesIds.includes(c.source.id) || nodesIds.includes(c.target.id))
			.map((c) => c.copy())
			.map((c) => {
				const sourceNode = this.rfInstance.getInternalNode(c.source.id)!;
				const targetNode = this.rfInstance.getInternalNode(c.target.id)!;
				const edgePosition = getEdgePosition({
					id: c.id,
					sourceNode: sourceNode,
					targetNode: targetNode,
					sourceHandle: c.source.handleId || null,
					targetHandle: c.target.handleId || null,
					connectionMode: ConnectionMode.Strict,
				});
				const newPoints = [...(c.data?.points || [])];
				newPoints.splice(0, 1, [edgePosition!.sourceX, edgePosition!.sourceY]);
				newPoints.splice(newPoints.length - 1, newPoints.length, [
					edgePosition!.targetX,
					edgePosition!.targetY,
				]);
				return {
					edgeId: c.id,
					newData: {
						...c.data,
						points: newPoints,
					},
				};
			})
			.filter((e) => {
				const connection = this.grafcet.connections.find((c) => c.id === e.edgeId);
				return connection && !deepObjectsComparison(e.newData, connection.data);
			});
		if (edgesDataToApply.length === 0) return { commands: [], edgesDataToApply: [] };
		return {
			commands: [
				new ConnectionsUpdateCommand(
					edgesDataToApply.map((e) => {
						const connection = this.grafcet.connections.find((c) => c.id === e.edgeId);
						return {
							connection: new GrafcetConnection(
								connection!.id,
								connection!.source,
								connection!.target,
								e.newData,
							),
							previous: connection!.copy(),
						};
					}),
				),
			],
			edgesDataToApply,
		};
	}
}
