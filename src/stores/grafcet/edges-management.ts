import { GrafcetEdgeType } from "@/components/grafcet/flow/grafcet-nodes-definitions";
import { deepObjectsComparison } from "@/lib/object";
import AbstractGrafcetCommand from "@/schemas/grafcet/commands/AbstractGrafcetCommand.class";
import ConnectionsUpdateCommand from "@/schemas/grafcet/commands/ConnectionsUpdateCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import { ReactFlowInstance } from "@xyflow/react";
import { ConnectionMode, getEdgePosition } from "@xyflow/system";

export const getInitialEdges = (grafcet: Grafcet): GrafcetEdgeType[] => {
	return grafcet.connections.map((connection) => {
		const sourceNode = grafcet.getElement(connection.source.type, connection.source.id);
		const targetNode = grafcet.getElement(connection.target.type, connection.target.id);
		if (!sourceNode || !targetNode)
			console.error("Source or target node not found for connection " + connection.id);
		return {
			id: connection.id,
			type: "custom-edge",
			source: connection.source.id,
			sourceHandle: connection.source.handleId,
			target: connection.target.id,
			targetHandle: connection.target.handleId,
			data: connection.data,
		} as GrafcetEdgeType;
	});
};

export const handleEdgeDataChange = (
	rfInstance: ReactFlowInstance,
	grafcet: Grafcet,
	setEdges: (updater: (edges: GrafcetEdgeType[]) => any[]) => void,
	edgeId: string,
	newData:
		| Partial<GrafcetEdgeType["data"]>
		| ((prevData: GrafcetEdgeType["data"]) => Partial<GrafcetEdgeType["data"]>),
): AbstractGrafcetCommand<any>[] => {
	const edge = rfInstance.getEdge(edgeId);
	if (!edge) throw new Error("Edge not found in the flow instance");
	if (typeof newData === "function") {
		const prevData = edge.data as any;
		newData = newData(prevData);
	}
	if (!newData || Object.keys(newData).length === 0) return [];
	setEdges((eds) => eds.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, ...newData } } : e)));
	const connection = grafcet.connections.find((c) => c.id === edgeId);
	if (!connection) throw new Error("Connection not found in the grafcet");
	const modifiedConnection = connection.copy();
	modifiedConnection.data = { ...modifiedConnection.data, ...newData };
	//Make sure to only create a command if the data has actually changed, to avoid creating unnecessary commands
	if (connection.data == undefined || deepObjectsComparison(modifiedConnection.data, connection.data))
		return []; //No need to update if the data is the same
	return [
		new ConnectionsUpdateCommand([
			{
				connection: modifiedConnection,
				previous: connection.copy(),
			},
		]),
	];
};

/**
 * Commands to execute when nodes are moved or resized,
 * to update the connections points accordingly
 */
export const getEdgesUpdateCommandsWhenNodesMovedOrResized = (
	rfInstance: ReactFlowInstance,
	grafcet: Grafcet,
	setEdges: (updater: (edges: GrafcetEdgeType[]) => any[]) => void,
	nodesIds: string[],
): AbstractGrafcetCommand<any>[] => {
	if (nodesIds.length === 0) return [];
	const connectionsToUpdate = grafcet.connections
		.filter((c) => nodesIds.includes(c.source.id) || nodesIds.includes(c.target.id))
		.map((c) => c.copy());
	//Update the points
	setEdges((eds) =>
		eds.map((e) => {
			const connectionToUpdate = connectionsToUpdate.find((c) => c.id === e.id);
			if (!connectionToUpdate) return e;
			const sourceNode = rfInstance.getInternalNode(e.source)!;
			const targetNode = rfInstance.getInternalNode(e.target)!;
			const edgePosition = getEdgePosition({
				id: e.id,
				sourceNode: sourceNode,
				targetNode: targetNode,
				sourceHandle: e.sourceHandle || null,
				targetHandle: e.targetHandle || null,
				connectionMode: ConnectionMode.Strict,
			});
			const newPoints = [...(e.data?.points || [])];
			newPoints.splice(0, 1, [edgePosition!.sourceX, edgePosition!.sourceY]);
			newPoints.splice(newPoints.length - 1, newPoints.length, [
				edgePosition!.targetX,
				edgePosition!.targetY,
			]);
			const newData = {
				...e.data,
				points: newPoints,
			};
			//Update the connection data in the grafcet
			connectionToUpdate.data = newData;
			return {
				...e,
				data: newData,
			};
		}),
	);
	if (connectionsToUpdate.length === 0) return [];
	return [
		new ConnectionsUpdateCommand(
			connectionsToUpdate.map((connection) => ({
				connection: connection,
				previous: grafcet.connections.find((c) => c.id === connection.id)!.copy(),
			})),
		),
	];
};
