import { GrafcetEdgeType, GrafcetNodeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import { ReactFlowInstance } from "@xyflow/react";
import { GrafcetStoreGetFunction, GrafcetStoreSetFunction } from "../grafcet.store";

export const GRAFCET_FLOW_MIN_ZOOM = 1;
export const GRAFCET_FLOW_MAX_ZOOM = 2.5;

/**
 * Aspects de la vue qui ne relèvent pas du domaine : sélection, surlignage, zoom, et
 * l'instance React Flow elle-même.
 *
 * Ne modifie jamais `nodes`/`edges` pour refléter un changement du grafcet — c'est le rôle de
 * `WorkflowManager`, qui passe par le `CommandsStackManager` pour que la vue soit recalculée
 * depuis le domaine (`NodesFactory.syncNodes`, `EdgesFactory.syncEdges`), jamais patchée à la
 * main.
 */
export default class ViewManager {
	private setStoreState: GrafcetStoreSetFunction;
	private getStoreState: GrafcetStoreGetFunction;

	rfInstance: ReactFlowInstance | null = null;

	/**
	 * Minuteries de surlignage temporaire en attente. Suivies pour pouvoir les annuler à la
	 * fermeture de la page : sans ça, un `setTimeout` en attente continuait de déclencher un
	 * `setStoreState` après que le store ait été abandonné, sur une instance de `ViewManager`
	 * que plus personne ne lit.
	 */
	private pendingHighlightTimeouts = new Set<ReturnType<typeof setTimeout>>();

	constructor(setStoreState: GrafcetStoreSetFunction, getStoreState: GrafcetStoreGetFunction) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	/**
	 * Throw an error if the view manager is not ready, meaning that the ReactFlow instance is not set yet
	 */
	throwErrorIfNotReady(): void {
		if (this.rfInstance === null) {
			throw new Error("ViewManager is not ready. ReactFlow instance is not set.");
		}
	}

	setReactFlowInstance(instance: ReactFlowInstance): void {
		this.rfInstance = instance;
	}

	getNodes(): GrafcetNodeType[] {
		return this.getStoreState().nodes!;
	}

	getEdges(): GrafcetEdgeType[] {
		return this.getStoreState().edges!;
	}

	selectAllEdges(): void {
		this.setStoreState((state) => ({ edges: state.edges?.map((e) => ({ ...e, selected: true })) }));
	}

	selectAllNodesAndEdges(): void {
		this.setStoreState((state) => ({
			nodes: state.nodes?.map((n) => ({ ...n, selected: true })),
			edges: state.edges?.map((e) => ({ ...e, selected: true })),
		}));
	}

	selectNodesAndEdges(nodesIds: string[], edgesIds: string[], deselectOtherElements = false): void {
		if (deselectOtherElements) {
			this.setStoreState((state) => ({
				nodes: state.nodes?.map((n) => ({ ...n, selected: nodesIds.includes(n.id) })),
				edges: state.edges?.map((e) => ({ ...e, selected: edgesIds.includes(e.id) })),
			}));
			return;
		} else {
			this.setStoreState((state) => ({
				nodes: state.nodes?.map((n) => (nodesIds.includes(n.id) ? { ...n, selected: true } : n)),
				edges: state.edges?.map((e) => (edgesIds.includes(e.id) ? { ...e, selected: true } : e)),
			}));
		}
	}

	deselectNodesAndEdges(nodesIds: string[], edgesIds: string[]): void {
		this.setStoreState((state) => ({
			nodes: state.nodes?.map((n) => (nodesIds.includes(n.id) ? { ...n, selected: false } : n)),
			edges: state.edges?.map((e) => (edgesIds.includes(e.id) ? { ...e, selected: false } : e)),
		}));
	}

	deselectAllNodesAndEdges(): void {
		this.setStoreState((state) => ({
			nodes: state.nodes?.map((n) => ({ ...n, selected: false })),
			edges: state.edges?.map((e) => ({ ...e, selected: false })),
		}));
	}

	highlightNodesAndEdges(nodesIds: string[], edgesIds: string[]): void {
		this.setStoreState((state) => ({
			highlightedNodesIds: [...(state.highlightedNodesIds || []), ...nodesIds],
			highlightedEdgesIds: [...(state.highlightedEdgesIds || []), ...edgesIds],
		}));
	}

	unhighlightNodesAndEdges(nodesIds: string[], edgesIds: string[]): void {
		this.setStoreState((state) => ({
			highlightedNodesIds: state.highlightedNodesIds?.filter((id) => !nodesIds.includes(id)),
			highlightedEdgesIds: state.highlightedEdgesIds?.filter((id) => !edgesIds.includes(id)),
		}));
	}

	temporarilyHighlightNodesAndEdges(nodesIds: string[], edgesIds: string[], durationMs = 2000): void {
		this.highlightNodesAndEdges(nodesIds, edgesIds);
		const timeout = setTimeout(() => {
			this.pendingHighlightTimeouts.delete(timeout);
			this.unhighlightNodesAndEdges(nodesIds, edgesIds);
		}, durationMs);
		this.pendingHighlightTimeouts.add(timeout);
	}

	/**
	 * Annule les surlignages temporaires encore en attente. À appeler à la fermeture de la
	 * page du grafcet, avant d'abandonner ce `ViewManager`.
	 */
	dispose(): void {
		this.pendingHighlightTimeouts.forEach((timeout) => clearTimeout(timeout));
		this.pendingHighlightTimeouts.clear();
	}

	getZoom(): number {
		if (!this.rfInstance) return 1;
		return this.rfInstance.getZoom();
	}

	zoomIn(): void {
		if (!this.rfInstance) return;
		this.rfInstance.zoomIn();
	}

	zoomOut(): void {
		if (!this.rfInstance) return;
		this.rfInstance.zoomOut();
	}

	fitView() {
		if (!this.rfInstance) return;
		this.rfInstance.fitView();
	}
}
