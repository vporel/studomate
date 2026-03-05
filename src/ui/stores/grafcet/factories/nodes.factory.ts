import { ElementType } from "@/schemas/grafcet/element.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { GrafcetNodeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";

export default class NodesFactory {
	static getInitialNodes(grafcet: Grafcet): GrafcetNodeType[] {
		const typesToElementsMap = grafcet.getTypeToElementsMap();
		const nodes: GrafcetNodeType[] = [];
		(Object.keys(typesToElementsMap) as ElementType[]).forEach((type) => {
			const elements = typesToElementsMap[type];
			elements.forEach((element) => {
				nodes.push({
					id: element.id,
					type,
					data: element.data,
					position: element.position,
				} as GrafcetNodeType);
			});
		});
		return nodes;
	}
}
