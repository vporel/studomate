import Section from "@/schemas/ladder/section.schema";
import { LadderNodeType } from "@/ui/components/ladder/flow/ladder-nodes-definitions";
import AbstractNodesFactory from "@/ui/stores/shared/abstract-nodes.factory";
import { buildTargetNodes } from "@/ui/utils/ladder/ladder-flow-builder";

class LadderNodesFactory extends AbstractNodesFactory<LadderNodeType, Section, LadderNodeType> {
	protected getDomainElements(section: Section): LadderNodeType[] {
		return buildTargetNodes(section);
	}


	protected buildNode(domain: LadderNodeType): LadderNodeType {
		return domain;
	}
}

const factory = new LadderNodesFactory();

export default factory;
