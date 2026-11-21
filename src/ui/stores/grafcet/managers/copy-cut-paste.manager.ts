import StepHelper from "@/schemas/grafcet/helpers/step.helper";
import { createRandomId } from "@/ids";
import type {
	GrafcetEdgeType,
	GrafcetNodeType,
} from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import { GRAFCET_PAGE_DIMENSIONS } from "@/ui/utils/grafcet/grafcet-utils";
import {
	GrafcetStoreGetFunction,
	GrafcetStoreSetFunction,
} from "../grafcet.store";
import type { ClipboardStore } from "@/ui/stores/shared/clipboard.store";
import AbstractCopyCutPasteManager from "@/ui/stores/shared/abstract-copy-cut-paste.manager";

export default class GrafcetCopyCutPasteManager extends AbstractCopyCutPasteManager<{
	nodes: GrafcetNodeType[];
	edges: GrafcetEdgeType[];
}> {
	protected readonly scope = "grafcet" as const;
	private setStoreState: GrafcetStoreSetFunction;
	private getStoreState: GrafcetStoreGetFunction;

	constructor(
		setStoreState: GrafcetStoreSetFunction,
		getStoreState: GrafcetStoreGetFunction,
		clipboard: ClipboardStore,
	) {
		super(clipboard);
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	copySelectedElements() {
		const nodes = this.getStoreState().nodes.filter((n) => n.selected);
		const edges = this.getStoreState().edges.filter((e) => e.selected);
		this.copyElements(nodes, edges);
	}

	protected isSelectionEmpty(): boolean {
		return (
			!this.getStoreState().nodes.some((n) => n.selected) &&
			!this.getStoreState().edges.some((e) => e.selected)
		);
	}

	protected deleteSelectedElements(): void {
		const nodes = this.getStoreState().nodes.filter((n) => n.selected);
		const edges = this.getStoreState().edges.filter((e) => e.selected);
		this.getStoreState().workflowManager.deleteNodesAndEdges(
			nodes.map((n) => n.id),
			edges.map((e) => e.id),
		);
	}

	copyElements(nodes: GrafcetNodeType[], edges: GrafcetEdgeType[]) {
		if (nodes.length === 0 && edges.length === 0) return;
		this.writeClipboard({
			nodes: structuredClone(nodes),
			edges: structuredClone(edges),
		});
	}

	pasteElements(mousePosition?: { x: number; y: number }): {
		addedNodes: GrafcetNodeType[];
		addedEdges: GrafcetEdgeType[];
	} {
		const rfInstance = this.getStoreState().viewManager.rfInstance;
		const grafcet = this.getStoreState().grafcet;
		const existingNodes = this.getStoreState().nodes;
		const copiedElements = this.readClipboard();
		if (!rfInstance || !copiedElements) {
			return {
				addedNodes: [],
				addedEdges: [],
			};
		}
		this.getStoreState().viewManager.deselectAllNodesAndEdges();
		//One delta moves the whole pasted group, so nodes and edge points keep their relative positions
		const delta = this.computePasteDelta(
			copiedElements.nodes,
			existingNodes,
			rfInstance,
			mousePosition,
		);
		const nodesIdsMap: Record<string, string> = {}; //Map to keep track of the old node ids and the new node ids, to update the edges source and target
		let nextStepNumber = StepHelper.getNextAvailableNumber(grafcet);
		const newNodes = structuredClone(copiedElements.nodes).map((node) => {
			const newNode = {
				...node,
				id: createRandomId(),
				position: {
					x: node.position!.x + delta.x,
					y: node.position!.y + delta.y,
				},
			};
			//If the node is a step, change the number to avoid duplicates with existing steps in the grafcet
			if (newNode.type === "step") {
				newNode.data.number = nextStepNumber++;
				//For a copy, if the step was initial we should past a non-initial step,
				//because there can be only one initial step in a grafcet
				//We first check if an initial step already exists in the grafcet
				const initialStepExists = grafcet.hasInitialStep();
				newNode.data.initial = initialStepExists ? false : newNode.data.initial;
			}
			nodesIdsMap[node.id] = newNode.id;
			return newNode;
		});
		//An edge can not be pasted if its source or target node is not pasted, so we filter the edges to paste
		const newEdges = structuredClone(copiedElements.edges)
			.filter(
				(edge) =>
					copiedElements!.nodes.find((node) => node.id === edge.source) &&
					copiedElements!.nodes.find((node) => node.id === edge.target),
			)
			.map((edge) => {
				const newSource = nodesIdsMap[edge.source];
				const newTarget = nodesIdsMap[edge.target];
				if (!newSource || !newTarget) {
					console.error("Source or target node not found for edge " + edge.id);
					return null;
				}
				//`data.points` ne porte que les coudes intermédiaires : ils suivent le décalage
				//de collage, les extrémités sont dérivées des nouveaux nœuds au rendu.
				const newPoints = (edge.data?.points ?? []).map(
					(p) => [p[0] + delta.x, p[1] + delta.y] as [number, number],
				);
				return {
					...edge,
					id: createRandomId(),
					source: newSource,
					target: newTarget,
					data: {
						points: newPoints,
					},
				} as GrafcetEdgeType;
			})
			.filter((edge): edge is GrafcetEdgeType => edge !== null);
		this.getStoreState().workflowManager.addNodesAndEdges(newNodes, newEdges);
		this.getStoreState().viewManager.focus();
		return {
			addedNodes: newNodes,
			addedEdges: newEdges,
		};
	}

	/**
	 * Translation applied to the pasted group. With the mouse over the page, the group's bounding
	 * box is centred on the pointer and kept inside the page. Otherwise the group is shifted by
	 * steps of 10 until none of its nodes sits exactly on an existing node.
	 */
	private computePasteDelta(
		copiedNodes: GrafcetNodeType[],
		existingNodes: GrafcetNodeType[],
		rfInstance: NonNullable<
			ReturnType<GrafcetStoreGetFunction>["viewManager"]["rfInstance"]
		>,
		mousePosition?: { x: number; y: number },
	): { x: number; y: number } {
		const flowMouse = mousePosition
			? rfInstance.screenToFlowPosition(mousePosition)
			: null;
		if (flowMouse && flowMouse.x >= 0 && flowMouse.y >= 0) {
			const bounds = rfInstance.getNodesBounds(copiedNodes);
			const clamp = (value: number, size: number, limit: number) =>
				Math.max(0, Math.min(value, limit - size));
			return {
				x:
					clamp(
						flowMouse.x - bounds.width / 2,
						bounds.width,
						GRAFCET_PAGE_DIMENSIONS.width,
					) - bounds.x,
				y:
					clamp(
						flowMouse.y - bounds.height / 2,
						bounds.height,
						GRAFCET_PAGE_DIMENSIONS.height,
					) - bounds.y,
			};
		}
		const isTaken = (x: number, y: number) =>
			existingNodes.some((n) => n.position?.x === x && n.position?.y === y);
		let step = 0;
		while (
			copiedNodes.some((n) =>
				isTaken(n.position!.x + step * 10, n.position!.y + step * 10),
			)
		) {
			step++;
		}
		return { x: step * 10, y: step * 10 };
	}
}
