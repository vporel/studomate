import { deepObjectsComparison } from "@/lib/object";
import Connection from "@/schemas/grafcet//connection.schema";
import AbstractGrafcetCommand from "@/schemas/grafcet/commands/abstract-grafcet.command";
import ConnectionsAddCommand from "@/schemas/grafcet/commands/connections-add.command";
import ConnectionsRemoveCommand from "@/schemas/grafcet/commands/connections-remove.command";
import ConnectionsUpdateCommand from "@/schemas/grafcet/commands/connections-update.command";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { CustomEdgeData } from "@/ui/components/grafcet/edges/CustomEdge";
import { GrafcetEdgeType, GrafcetNodeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import { ConnectionMode, getEdgePosition } from "@xyflow/system";
import ViewManager from "../managers/view.manager";

export default class ConnectionsCommandsFactory {
	/**
	 * @param newEdges
	 * @param nodes Needed to find the source and target nodes of the connections to add, to be able to create the corresponding data and commands
	 */
	static onEdgesAdd(
		newEdges: GrafcetEdgeType[],
		nodes: GrafcetNodeType[],
		grafcet: Grafcet,
		existingEdges: GrafcetEdgeType[],
	): {
		commands: AbstractGrafcetCommand<any>[];
		edgesToAdd: GrafcetEdgeType[];
	} {
		const edgesToAdd = newEdges.filter((e) => !existingEdges.find((ee) => ee.id === e.id));
		const commands = [];
		const connectionsToAdd = newEdges
			.map((edge) => {
				const sourceNode = nodes.find((n) => n.id === edge.source);
				const targetNode = nodes.find((n) => n.id === edge.target);
				if (!sourceNode || !targetNode) return null;
				return new Connection(
					edge.id,
					{
						id: edge.source,
						type: sourceNode.type,
						handle: edge.sourceHandle || "",
					},
					{
						id: edge.target,
						type: targetNode.type,
						handle: edge.targetHandle || "",
					},
					edge.data!,
				);
			})
			.filter((c): c is Connection => c !== null);
		if (connectionsToAdd.length > 0) {
			commands.push(new ConnectionsAddCommand(connectionsToAdd));
		}
		return {
			commands,
			edgesToAdd,
		};
	}

	static onEdgesRemove(
		edgesIds: string[],
		grafcet: Grafcet,
	): {
		commands: AbstractGrafcetCommand<any>[];
		edgesIdsToDelete: string[];
	} {
		const connectionsToRemove = grafcet.connections.filter((c) => edgesIds.includes(c.id));
		const commands = [];
		if (connectionsToRemove.length > 0) {
			commands.push(new ConnectionsRemoveCommand(connectionsToRemove.map((c) => c.copy())));
		}
		return {
			commands,
			edgesIdsToDelete: connectionsToRemove.map((c) => c.id),
		};
	}

	static onEdgeDataChange(
		setEdges: (updater: (edges: GrafcetEdgeType[]) => any[]) => void,
		edgeId: string,
		newData:
			| Partial<GrafcetEdgeType["data"]>
			| ((prevData: GrafcetEdgeType["data"]) => Partial<GrafcetEdgeType["data"]>),
		grafcet: Grafcet,
		existingEdges: GrafcetEdgeType[],
	): {
		commands: AbstractGrafcetCommand<any>[];
		edgeDataToApply: Partial<CustomEdgeData>;
	} {
		const edge = existingEdges.find((e) => e.id === edgeId);
		if (!edge) throw new Error(`Edge not found: ${edgeId}`);
		if (typeof newData === "function") {
			const prevData = edge.data as any;
			newData = newData(prevData);
		}
		if (!newData || Object.keys(newData).length === 0) return { commands: [], edgeDataToApply: {} }; //No need to update if the new data is empty
		const connection = grafcet.connections.find((c) => c.id === edgeId);
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
	static onNodesMovedOrResized(
		nodesIds: string[],
		grafcet: Grafcet,
		viewManager: ViewManager,
	): {
		commands: AbstractGrafcetCommand<any>[];
		edgesDataToApply: { edgeId: string; newData: GrafcetEdgeType["data"] }[];
	} {
		const rfInstance = viewManager.rfInstance;
		if (!rfInstance || nodesIds.length === 0) return { commands: [], edgesDataToApply: [] };
		const edgesDataToApply = grafcet.connections
			.filter((c) => nodesIds.includes(c.source.id) || nodesIds.includes(c.target.id))
			.map((c) => c.copy())
			.map((c) => {
				const sourceNode = rfInstance.getInternalNode(c.source.id)!;
				const targetNode = rfInstance.getInternalNode(c.target.id)!;
				const edgePosition = getEdgePosition({
					id: c.id,
					sourceNode: sourceNode,
					targetNode: targetNode,
					sourceHandle: c.source.handle || null,
					targetHandle: c.target.handle || null,
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
				const connection = grafcet.connections.find((c) => c.id === e.edgeId);
				return connection && !deepObjectsComparison(e.newData, connection.data);
			});
		if (edgesDataToApply.length === 0) return { commands: [], edgesDataToApply: [] };
		return {
			commands: [
				new ConnectionsUpdateCommand(
					edgesDataToApply.map((e) => {
						const connection = grafcet.connections.find((c) => c.id === e.edgeId);
						return {
							connection: new Connection(
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
