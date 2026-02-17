import { getConnectionLinePoints } from "@/components/grafcet/connections-lines/CustomConnectionLine";
import { GrafcetEdgeType } from "@/components/grafcet/flow/grafcet-nodes-definitions";
import { PAPERS_SIZES } from "@/constants";
import { mmToPx } from "@/lib/utils";
import { GrafcetFormat } from "@/schemas/grafcet/Grafcet.class";
import GrafcetConnection from "@/schemas/grafcet/GrafcetConnection.class";
import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import { ReactFlowInstance, Connection as XYFlowConnection } from "@xyflow/react";
import { ConnectionMode, getEdgePosition } from "@xyflow/system";

export function grafcetConnectionFromXYFlowConnectionOrEdge(
	rfInstance: ReactFlowInstance,
	connection: XYFlowConnection | GrafcetEdgeType,
	connectionId: string,
): GrafcetConnection | null {
	const sourceNode = rfInstance.getInternalNode(connection.source);
	const targetNode = rfInstance.getInternalNode(connection.target);
	if (!sourceNode || !targetNode) return null;
	const edgePosition = getEdgePosition({
		id: connectionId,
		sourceNode: sourceNode,
		targetNode: targetNode,
		sourceHandle: connection.sourceHandle || null,
		targetHandle: connection.targetHandle || null,
		connectionMode: ConnectionMode.Strict,
	});
	return new GrafcetConnection(
		connectionId,
		{
			type: sourceNode.type as GrafcetElementType,
			id: sourceNode.id,
			handleId: connection.sourceHandle || "",
		},
		{
			type: targetNode.type as GrafcetElementType,
			id: targetNode.id,
			handleId: connection.targetHandle || "",
		},
		(connection as GrafcetEdgeType).data || {
			points: getConnectionLinePoints(
				edgePosition!.sourceX,
				edgePosition!.sourceY,
				edgePosition!.targetX,
				edgePosition!.targetY,
			),
		},
	);
}

export function getFlowDimensions(format: GrafcetFormat) {
	switch (format.type) {
		case "A4":
			return {
				width: mmToPx(
					format.orientation === "portrait"
						? PAPERS_SIZES.A4_PORTRAIT.width
						: PAPERS_SIZES.A4_LANDSCAPE.width,
				),
				height: mmToPx(
					format.orientation === "portrait"
						? PAPERS_SIZES.A4_PORTRAIT.height
						: PAPERS_SIZES.A4_LANDSCAPE.height,
				),
			};
		case "A3":
			return {
				width: mmToPx(
					format.orientation === "portrait"
						? PAPERS_SIZES.A3_PORTRAIT.width
						: PAPERS_SIZES.A3_LANDSCAPE.width,
				),
				height: mmToPx(
					format.orientation === "portrait"
						? PAPERS_SIZES.A3_PORTRAIT.height
						: PAPERS_SIZES.A3_LANDSCAPE.height,
				),
			};
	}
}
