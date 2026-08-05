import Section from "@/schemas/ladder/section.schema";
import AbstractEdgesFactory from "@/ui/stores/shared/abstract-edges.factory";
import { buildTargetEdges } from "@/ui/utils/ladder/ladder-flow-builder";
import { Edge } from "@xyflow/react";

class LadderEdgesFactory extends AbstractEdgesFactory<Edge, Section, Edge> {
	protected getDomainElements(section: Section): Edge[] {
		return buildTargetEdges(section);
	}



	protected buildEdge(domain: Edge): Edge {
		return domain;
	}
}

const factory = new LadderEdgesFactory();

export default factory;
