import { GrafcetEdgeType } from "@/components/grafcet/flow/grafcet-nodes-definitions";
import Grafcet from "@/schemas/grafcet/Grafcet.class";

export default class EdgesFactory {
	static getInitialEdges(grafcet: Grafcet): GrafcetEdgeType[] {
		return grafcet.connections.map((connection) => {
			const sourceNode = grafcet.getElementByIdAndType(connection.source.id, connection.source.type);
			const targetNode = grafcet.getElementByIdAndType(connection.target.id, connection.target.type);
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
	}
}
