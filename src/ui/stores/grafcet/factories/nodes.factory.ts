import Element, { ElementType } from "@/schemas/grafcet/element.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { deepObjectsComparison } from "@/lib/object";
import { GrafcetNodeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";

export default class NodesFactory {
	static getInitialNodes(grafcet: Grafcet): GrafcetNodeType[] {
		return this.syncNodes([], grafcet);
	}

	/**
	 * Rebuilds the React Flow nodes so that they match the grafcet, without ever patching
	 * them by hand.
	 *
	 * Three guarantees, in order of importance:
	 *
	 * 1. **View state survives.** Only the fields the domain owns (`data`, `position`) are
	 *    overwritten; everything else is carried over from the previous node — `selected`
	 *    first of all, but also `measured`, `width`/`height` written by NodeResizer,
	 *    `dragging`, and any internal field React Flow may add. Starting from the previous
	 *    node rather than listing the view fields is deliberate: a field we do not know
	 *    about is preserved anyway.
	 *
	 * 2. **Identity is preserved.** A node whose element did not change is returned *as is*,
	 *    same reference. React and React Flow compare by reference, so only the nodes that
	 *    really changed are re-rendered — moving one node does not redraw the whole grafcet.
	 *
	 * 3. **Order is preserved.** Existing nodes keep their position in the array, new ones
	 *    are appended. Node order drives stacking in React Flow, so rebuilding in domain
	 *    order would silently change what is drawn on top.
	 */
	static syncNodes(prevNodes: GrafcetNodeType[], grafcet: Grafcet): GrafcetNodeType[] {
		const elementsById = new Map<string, { element: Element<any>; type: ElementType }>();
		const typesToElementsMap = grafcet.getTypeToElementsMap();
		(Object.keys(typesToElementsMap) as ElementType[]).forEach((type) => {
			typesToElementsMap[type].forEach((element) => elementsById.set(element.id, { element, type }));
		});

		const nodes: GrafcetNodeType[] = [];
		const keptIds = new Set<string>();

		//Existing nodes, in their current order: updated, or dropped if the element is gone
		for (const prevNode of prevNodes) {
			const entry = elementsById.get(prevNode.id);
			if (!entry) continue;
			keptIds.add(prevNode.id);
			nodes.push(this.syncNode(prevNode, entry.element));
		}

		//Elements that have no node yet
		for (const [id, { element, type }] of elementsById) {
			if (keptIds.has(id)) continue;
			nodes.push({
				id: element.id,
				type,
				data: element.data,
				position: element.position,
			} as GrafcetNodeType);
		}

		return nodes;
	}

	private static syncNode(prevNode: GrafcetNodeType, element: Element<any>): GrafcetNodeType {
		//While a node is being dragged or resized, the view is authoritative on its geometry:
		//the domain has not received the new position yet (the command is only emitted once
		//the gesture ends), so realigning on it would make the node jump back under the cursor.
		const inGesture = prevNode.dragging === true || (prevNode as { resizing?: boolean }).resizing === true;
		const position = inGesture ? prevNode.position : element.position;

		const sameData = deepObjectsComparison(element.data, prevNode.data);
		const samePosition = position.x === prevNode.position.x && position.y === prevNode.position.y;
		if (sameData && samePosition) return prevNode;
		return {
			...prevNode,
			data: element.data,
			position,
		} as GrafcetNodeType;
	}
}
