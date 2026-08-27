import { Edge } from "@xyflow/react";
import { deepObjectsComparison } from "@/lib/object";

/**
 * Classe abstraite factorisant l'algorithme de réconciliation React Flow pour les arêtes.
 */
export default abstract class AbstractEdgesFactory<
	TEdge extends Edge,
	TSource,
	TDomain extends { id: string },
> {
	getInitialEdges(source: TSource): TEdge[] {
		return this.syncEdges([], source);
	}

	syncEdges(prevEdges: TEdge[], source: TSource): TEdge[] {
		const domainElements = this.getDomainElements(source);
		const domainById = new Map(domainElements.map((d) => [d.id, d]));
		const edges: TEdge[] = [];
		const keptIds = new Set<string>();

		for (const prev of prevEdges) {
			const domain = domainById.get(prev.id);
			if (!domain) continue;
			keptIds.add(prev.id);
			edges.push(this.syncEdge(prev, domain));
		}

		for (const domain of domainElements) {
			const id = domain.id;
			if (keptIds.has(id)) continue;
			edges.push(this.buildEdge(domain));
		}

		return edges;
	}

	protected abstract getDomainElements(source: TSource): TDomain[];
	protected abstract buildEdge(domain: TDomain): TEdge;

	protected syncEdge(prevEdge: TEdge, domain: TDomain): TEdge {
		const built = this.buildEdge(domain);
		if (
			deepObjectsComparison(built.data, prevEdge.data) &&
			built.source === prevEdge.source &&
			built.target === prevEdge.target &&
			built.sourceHandle === prevEdge.sourceHandle &&
			built.targetHandle === prevEdge.targetHandle
		) {
			return prevEdge;
		}
		return {
			...prevEdge,
			source: built.source,
			sourceHandle: built.sourceHandle,
			target: built.target,
			targetHandle: built.targetHandle,
			data: built.data,
		};
	}
}
