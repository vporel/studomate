import { GrafcetNodeType } from "@/components/grafcet/flow/grafcet-nodes-definitions";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";

export default class NodesFactory {
	static getInitialNodes(grafcet: Grafcet): GrafcetNodeType[] {
		const typesToElementsMap = grafcet.getTypeToElementsMap();
		const nodes: GrafcetNodeType[] = [];
		(Object.keys(typesToElementsMap) as GrafcetElementType[]).forEach((type) => {
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
