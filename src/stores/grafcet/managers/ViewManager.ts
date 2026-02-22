import { GrafcetEdgeType, GrafcetNodeType } from "@/components/grafcet/flow/grafcet-nodes-definitions";
import { ReactFlowInstance } from "@xyflow/react";
import { GrafcetStoreGetFunction, GrafcetStoreSetFunction } from "../grafcet-store-types";

/**
 * Manage the grafcet flow
 * You should use the workflow manager to perform any operation that modify the grafcet schema (add/remove nodes or edges, or update the data of a node or an edge) to make sure that the grafcet state is always consistent and that the commands stack is properly updated
 * It also provides some helper methods to select/deselect nodes and edges, and to zoom in/out or fit the view
 */
export default class ViewManager {
	private setStoreState: GrafcetStoreSetFunction;
	private getStoreState: GrafcetStoreGetFunction;

	rfInstance: ReactFlowInstance | null = null;

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

	/**
	 * Only one method to prevent multiple updates of the flow state
	 * It is possible to provide only newNodes or newEdges if we only want to add one of the two
	 * The null or empty array will be ignored
	 * @param newNodes
	 * @param newEdges
	 */
	addNodesAndEdges(newNodes: GrafcetNodeType[] | null, newEdges: GrafcetEdgeType[] | null): void {
		if (!newNodes?.length && !newEdges?.length) return;
		if (newNodes?.length && !newEdges?.length) {
			this.setStoreState((state) => ({
				nodes: [...state.nodes!, ...newNodes!],
			}));
		} else if (!newNodes?.length && newEdges?.length) {
			this.setStoreState((state) => ({
				edges: [...state.edges!, ...newEdges!],
			}));
		} else {
			this.setStoreState((state) => ({
				nodes: [...state.nodes!, ...newNodes!],
				edges: [...state.edges!, ...newEdges!],
			}));
		}
	}

	getNodes(): GrafcetNodeType[] {
		return this.getStoreState().nodes!;
	}

	getNode(nodeId: string): GrafcetNodeType | undefined {
		return this.getStoreState().nodes!.find((n) => n.id === nodeId);
	}

	getEdges(): GrafcetEdgeType[] {
		return this.getStoreState().edges!;
	}

	getEdge(edgeId: string): GrafcetEdgeType | undefined {
		return this.getStoreState().edges!.find((e) => e.id === edgeId);
	}

	/**
	 * Only one method to prevent multiple updates of the flow state
	 * It is possible to provide only nodeIds or edgeIds if we only want to remove one of the two
	 * The null or empty array will be ignored
	 * @param nodeIds
	 * @param edgeIds
	 */
	removeNodesAndEdges(nodeIds: string[] | null, edgeIds: string[] | null): void {
		if (!nodeIds?.length && !edgeIds?.length) return;
		if (nodeIds?.length && !edgeIds?.length) {
			this.setStoreState((state) => ({
				nodes: state.nodes!.filter((n) => !nodeIds!.includes(n.id)),
			}));
		} else if (!nodeIds?.length && edgeIds?.length) {
			this.setStoreState((state) => ({
				edges: state.edges?.filter((e) => !edgeIds!.includes(e.id)),
			}));
		} else {
			this.setStoreState((state) => ({
				nodes: state.nodes?.filter((n) => !nodeIds!.includes(n.id)),
				edges: state.edges?.filter((e) => !edgeIds!.includes(e.id)),
			}));
		}
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

	deselectAllNodesAndEdges(): void {
		this.setStoreState((state) => ({
			nodes: state.nodes?.map((n) => ({ ...n, selected: false })),
			edges: state.edges?.map((e) => ({ ...e, selected: false })),
		}));
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
