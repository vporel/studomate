import { deepObjectsComparison } from "@/lib/object";
import Connection from "@/schemas/grafcet/connection.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { GrafcetEdgeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";

export default class EdgesFactory {
	static getInitialEdges(grafcet: Grafcet): GrafcetEdgeType[] {
		return this.syncEdges([], grafcet);
	}

	/**
	 * Rebuilds the React Flow edges so that they match the grafcet's connections.
	 * Same three guarantees as `NodesFactory.syncNodes`: the view state of an edge
	 * (`selected` in particular) survives, unchanged edges keep their identity, and the
	 * existing order is preserved.
	 */
	static syncEdges(prevEdges: GrafcetEdgeType[], grafcet: Grafcet): GrafcetEdgeType[] {
		const connectionsById = new Map(grafcet.connections.map((c) => [c.id, c]));
		const edges: GrafcetEdgeType[] = [];
		const keptIds = new Set<string>();

		for (const prevEdge of prevEdges) {
			const connection = connectionsById.get(prevEdge.id);
			if (!connection) continue;
			keptIds.add(prevEdge.id);
			edges.push(this.syncEdge(prevEdge, connection));
		}

		for (const [id, connection] of connectionsById) {
			if (keptIds.has(id)) continue;
			edges.push(this.buildEdge(connection));
		}

		return edges;
	}

	private static syncEdge(prevEdge: GrafcetEdgeType, connection: Connection): GrafcetEdgeType {
		const built = this.buildEdge(connection);
		if (
			deepObjectsComparison(built.data, prevEdge.data) &&
			built.source === prevEdge.source &&
			built.target === prevEdge.target &&
			built.sourceHandle === prevEdge.sourceHandle &&
			built.targetHandle === prevEdge.targetHandle
		) {
			return prevEdge;
		}
		//Only the fields owned by the domain are overwritten, the view state is carried over
		return {
			...prevEdge,
			source: built.source,
			sourceHandle: built.sourceHandle,
			target: built.target,
			targetHandle: built.targetHandle,
			data: built.data,
		} as GrafcetEdgeType;
	}

	private static buildEdge(connection: Connection): GrafcetEdgeType {
		return {
			id: connection.id,
			type: "custom-edge",
			source: connection.source.id,
			sourceHandle: connection.source.handle,
			target: connection.target.id,
			targetHandle: connection.target.handle,
			data: connection.data,
		} as GrafcetEdgeType;
	}
}
