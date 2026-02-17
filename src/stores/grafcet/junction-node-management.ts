import { GrafcetNodeType } from "@/components/grafcet/flow/grafcet-nodes-definitions";
import { JunctionNodeType } from "@/components/grafcet/nodes/junctions/JunctionNode";
import { NodeChange, NodeDimensionChange } from "@xyflow/react";

export const junction_onNodeChange = (
	change: NodeChange,
	changes: NodeChange[], //The other changes of the same batch
	nodes: GrafcetNodeType[],
	setNode: (nodeId: string, updater: (node: JunctionNodeType) => any) => void,
) => {
	const node = nodes?.find((n) => n.id === (change as any).id);
	if (!node || !node.type.includes("junction")) return;
	const dimensionsChange: NodeDimensionChange = changes.find(
		(c) => (c as any).id === (change as any).id && c.type === "dimensions",
	) as NodeDimensionChange;
	if (change.type == "position") {
		if (!dimensionsChange) return;
		//If the position of a junction node is changed
		//and there is also a change of dimensions for the same node,
		//we update the position of the bars in order to keep them in the same relative position to the node position, because during the resizing, the position of the node is updated before the dimensions are updated, so if we don't do this, the bars will be in the wrong position during the resizing
		//Update the branches positions, the pivot position and the node width according to the new position of the node
		const positionDelta = node.position.x! - change.position!.x;
		const nodeWidth = dimensionsChange.dimensions?.width;
		setNode(node.id, (n) => ({
			...n,
			data: {
				...n.data,
				width: nodeWidth ? nodeWidth : n.data.width,
				pivotPosition: n.data.pivotPosition + positionDelta,
				branches: Object.fromEntries(
					Object.entries(n.data.branches).map(([branchId, branch]) => [
						branchId,
						{ ...branch, position: branch.position + positionDelta },
					]),
				),
			},
		}));
	} else if (change.type == "dimensions") {
		const nodeWidth = dimensionsChange.dimensions?.width;
		setNode(node.id, (n) => ({
			...n,
			data: {
				...n.data,
				width: nodeWidth ? nodeWidth : n.data.width,
			},
		}));
	}
};
