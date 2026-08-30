import Element, { ElementType } from "@/schemas/grafcet/element.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { GrafcetNodeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import AbstractNodesFactory from "@/ui/stores/shared/abstract-nodes.factory";
import describeGrafcetElement from "./describe-grafcet-element";

type GrafcetElementEntry = {
	id: string;
	element: Element<any>;
	type: ElementType;
};

class NodesFactory extends AbstractNodesFactory<
	GrafcetNodeType,
	Grafcet,
	GrafcetElementEntry
> {
	protected getDomainElements(grafcet: Grafcet): GrafcetElementEntry[] {
		const typesToElementsMap = grafcet.getTypeToElementsMap();
		const allElements: GrafcetElementEntry[] = [];
		(Object.keys(typesToElementsMap) as ElementType[]).forEach((type) => {
			typesToElementsMap[type].forEach((element) =>
				allElements.push({ id: element.id, element, type }),
			);
		});
		return allElements;
	}

	protected buildNode(domain: GrafcetElementEntry): GrafcetNodeType {
		return {
			id: domain.element.id,
			type: domain.type,
			data: domain.element.data,
			position: domain.element.position,
			width: domain.element.size.width,
			height: domain.element.size.height,
			ariaLabel: describeGrafcetElement(domain.type, domain.element.data),
		} as GrafcetNodeType;
	}
}

const nodesFactory = new NodesFactory();
export default nodesFactory;
