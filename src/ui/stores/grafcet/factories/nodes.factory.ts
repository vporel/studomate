import Element, {
	ElementType,
	JUNCTION_TYPES,
} from "@/schemas/grafcet/element.schema";
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

	/**
	 * Contrairement aux autres nœuds (taille mesurée par React Flow), la largeur
	 * d'une jonction est portée par le domaine : elle définit la disposition du
	 * pivot et des branches. Elle est donc resynchronisée depuis le domaine, sauf
	 * pendant un redimensionnement où la vue garde la priorité.
	 */
	protected syncNode(
		prevNode: GrafcetNodeType,
		domain: GrafcetElementEntry,
	): GrafcetNodeType {
		const synced = super.syncNode(prevNode, domain);
		if (
			!JUNCTION_TYPES.includes(domain.type as (typeof JUNCTION_TYPES)[number]) ||
			this.isNodeInGesture(prevNode) ||
			(synced.width === domain.element.size.width &&
				synced.height === domain.element.size.height)
		)
			return synced;
		return {
			...synced,
			width: domain.element.size.width,
			height: domain.element.size.height,
		};
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
