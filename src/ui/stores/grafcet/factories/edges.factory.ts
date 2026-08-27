import Connection from "@/schemas/grafcet/connection.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { GrafcetEdgeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import AbstractEdgesFactory from "@/ui/stores/shared/abstract-edges.factory";

class EdgesFactory extends AbstractEdgesFactory<
	GrafcetEdgeType,
	Grafcet,
	Connection
> {
	protected getDomainElements(grafcet: Grafcet): Connection[] {
		return grafcet.connections;
	}

	protected buildEdge(connection: Connection): GrafcetEdgeType {
		return {
			id: connection.id,
			type: "grafcet-connection",
			source: connection.source.id,
			sourceHandle: connection.source.handle,
			target: connection.target.id,
			targetHandle: connection.target.handle,
			data: connection.data,
		} as GrafcetEdgeType;
	}
}

const edgesFactory = new EdgesFactory();
export default edgesFactory;
