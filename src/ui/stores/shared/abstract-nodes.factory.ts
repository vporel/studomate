import { deepObjectsComparison } from "@/lib/object";
import { Node } from "@xyflow/react";

/**
 * Classe abstraite factorisant l'algorithme de réconciliation React Flow pour les nœuds.
 */
export default abstract class AbstractNodesFactory<
	TNode extends Node,
	TSource,
	TDomain extends { id: string },
> {
	getInitialNodes(source: TSource): TNode[] {
		return this.syncNodes([], source);
	}

	/**
	 * Rebuilds the React Flow nodes so that they match the source domain (Grafcet or Section).
	 * Guarantees: View state survives, Identity is preserved, Order is preserved.
	 */
	syncNodes(prevNodes: TNode[], source: TSource): TNode[] {
		const domainElements = this.getDomainElements(source);
		const domainById = new Map(domainElements.map((d) => [d.id, d]));
		const nodes: TNode[] = [];
		const keptIds = new Set<string>();

		for (const prev of prevNodes) {
			const domain = domainById.get(prev.id);
			if (!domain) continue;
			keptIds.add(prev.id);
			nodes.push(this.syncNode(prev, domain));
		}

		for (const domain of domainElements) {
			const id = domain.id;
			if (keptIds.has(id)) continue;
			nodes.push(this.buildNode(domain));
		}

		return nodes;
	}

	protected abstract getDomainElements(source: TSource): TDomain[];

	/**
	 * Met à jour un nœud existant via `syncNodeDataAndPosition`, pour conserver la priorité de
	 * la vue pendant un geste (glisser-déposer).
	 */
	protected syncNode(prevNode: TNode, domain: TDomain): TNode {
		const built = this.buildNode(domain);
		return this.syncNodeDataAndPosition(
			prevNode,
			built.data,
			built.position,
		) as TNode;
	}

	protected abstract buildNode(domain: TDomain): TNode;

	protected isNodeInGesture(node: Node): boolean {
		return node.dragging === true || (node as any).resizing === true;
	}

	/** Helper pour synchroniser de manière sécurisée les data et la position */
	protected syncNodeDataAndPosition(
		prevNode: TNode,
		newData: any,
		newPosition: { x: number; y: number },
	): TNode {
		const position = this.isNodeInGesture(prevNode)
			? prevNode.position
			: newPosition;
		const samePosition =
			position.x === prevNode.position.x && position.y === prevNode.position.y;

		if (!samePosition) return { ...prevNode, data: newData, position } as TNode;
		if (deepObjectsComparison(newData, prevNode.data)) return prevNode;
		return { ...prevNode, data: newData, position } as TNode;
	}
}
