import StepHelper from "@/schemas/grafcet/helpers/step.helper";
import { createRandomId } from "@/schemas/utils/ids";
import { GrafcetEdgeType, GrafcetNodeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import { getFlowDimensions } from "@/ui/utils/grafcet/grafcet-utils";
import { focusFlow } from "../flow-management";
import { GrafcetStoreGetFunction, GrafcetStoreSetFunction } from "../grafcet.store";

export default class CopyCutPasteManager {
	private setStoreState: GrafcetStoreSetFunction;
	private getStoreState: GrafcetStoreGetFunction;
	private clipboard: { nodes: GrafcetNodeType[]; edges: GrafcetEdgeType[] } | null;

	constructor(setStoreState: GrafcetStoreSetFunction, getStoreState: GrafcetStoreGetFunction) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
		this.clipboard = null;
	}

	copySelectedElements() {
		const nodes = this.getStoreState().nodes.filter((n) => n.selected);
		const edges = this.getStoreState().edges.filter((e) => e.selected);
		this.copyElements(nodes, edges);
	}

	copyElements(nodes: GrafcetNodeType[], edges: GrafcetEdgeType[]) {
		if (nodes.length === 0 && edges.length === 0) return;
		this.clipboard = {
			nodes: structuredClone(nodes),
			edges: structuredClone(edges),
		};
	}

	pasteElements(mousePosition?: { x: number; y: number }): {
		addedNodes: GrafcetNodeType[];
		addedEdges: GrafcetEdgeType[];
	} {
		const rfInstance = this.getStoreState().viewManager.rfInstance;
		const grafcet = this.getStoreState().grafcet;
		const existingNodes = this.getStoreState().nodes;
		const copiedElements = this.clipboard;
		if (!rfInstance || !copiedElements) {
			return {
				addedNodes: [],
				addedEdges: [],
			};
		}
		this.getStoreState().viewManager.deselectAllNodesAndEdges();
		//Calculate the offset to apply to the pasted elements position so they are pasted at the mouse position,
		//or with an offset if the mouse position is not in the flow bounds,
		//or with a default offset if the mouse position is not provided
		const flowMousePosition = !mousePosition ? null : rfInstance.screenToFlowPosition(mousePosition);
		const flowDimensions = getFlowDimensions(grafcet.format);
		flowDimensions.width = Math.floor(flowDimensions.width);
		flowDimensions.height = Math.floor(flowDimensions.height);
		const nodesBounds = rfInstance.getNodesBounds(copiedElements.nodes);
		let offsetDueToMouse = null;
		if (flowMousePosition && flowMousePosition.x >= 0 && flowMousePosition.y >= 0) {
			offsetDueToMouse = {
				x: flowMousePosition.x - nodesBounds.x,
				y: flowMousePosition.y - nodesBounds.y,
			};
			//Using the bounds width and height, and the flowDimensions, make sure the pasted elements are not out of the flow bounds
			if (offsetDueToMouse.x + nodesBounds.x + nodesBounds.width > flowDimensions.width) {
				offsetDueToMouse.x -=
					offsetDueToMouse.x + nodesBounds.x + nodesBounds.width - flowDimensions.width;
			}
			if (offsetDueToMouse.y + nodesBounds.y + nodesBounds.height > flowDimensions.height) {
				offsetDueToMouse.y -=
					offsetDueToMouse.y + nodesBounds.y + nodesBounds.height - flowDimensions.height;
			}
		}
		const nodesIdsMap: Record<string, string> = {}; //Map to keep track of the old node ids and the new node ids, to update the edges source and target
		const nodesOffsetsMaps: Record<string, { x: number; y: number }> = {}; //Map to keep track of the nodes offsets, to update the edges points
		const newNodes = structuredClone(copiedElements.nodes).map((node) => {
			const newNode = {
				...node,
				id: createRandomId(),
			};
			//If the node is a step, change the number to avoid duplicates with existing steps in the grafcet
			if (newNode.type === "step") {
				newNode.data.number = StepHelper.getNextAvailableNumber(grafcet);
				//For a copy, if the step was initial we should past a non-initial step,
				//because there can be only one initial step in a grafcet
				//We first check if an initial step already exists in the grafcet
				const initialStepExists = grafcet.steps.some((s) => s.data.initial);
				newNode.data.initial = initialStepExists ? false : newNode.data.initial;
			}

			if (offsetDueToMouse) {
				newNode.position = {
					x: node.position!.x + offsetDueToMouse.x,
					y: node.position!.y + offsetDueToMouse.y,
				};
			} else {
				while (
					existingNodes.find(
						(n) => n.position?.x === newNode.position?.x && n.position?.y === newNode.position?.y,
					)
				) {
					newNode.position = {
						x: newNode.position!.x + 10,
						y: newNode.position!.y + 10,
					};
				}
			}
			//Center the node on the mouse position by applying an offset corresponding to half of the node dimensions
			newNode.position!.x = newNode.position!.x - node.data.width / 2;
			newNode.position!.y = newNode.position!.y - node.data.height / 2;
			//Save the id mapping and the offset for the edges update
			nodesIdsMap[node.id] = newNode.id;
			nodesOffsetsMaps[node.id] = {
				x: newNode.position!.x - node.position!.x,
				y: newNode.position!.y - node.position!.y,
			};
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
				const oldPoints = edge.data!.points;
				const newPoints = oldPoints.map((p) => [
					p[0] + (offsetDueToMouse?.x || 0),
					p[1] + (offsetDueToMouse?.y || 0),
				]);
				//Update the first and last point of the edge to be connected to the new source and target nodes position
				const newFirstPoint = [
					oldPoints[0][0] + nodesOffsetsMaps[edge.source].x,
					oldPoints[0][1] + nodesOffsetsMaps[edge.source].y,
				];
				const newLastPoint = [
					oldPoints[oldPoints.length - 1][0] + nodesOffsetsMaps[edge.target].x,
					oldPoints[oldPoints.length - 1][1] + nodesOffsetsMaps[edge.target].y,
				];
				newPoints.splice(0, 1, newFirstPoint);
				newPoints.splice(newPoints.length - 1, newPoints.length, newLastPoint);
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
		focusFlow(grafcet.id);
		return {
			addedNodes: newNodes,
			addedEdges: newEdges,
		};
	}
}
