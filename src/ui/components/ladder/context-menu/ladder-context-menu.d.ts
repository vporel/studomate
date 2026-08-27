import { XYPosition } from "@xyflow/react";
import { LadderNodeType } from "../flow/ladder-nodes-definitions";
import { LADDER_CONNECTION_EDGE_TYPE } from "@/ui/utils/ladder/ladder-flow-builder";
import { Edge } from "@xyflow/react";

export type LadderConnectionEdgeType = Edge<
	Record<string, never>,
	typeof LADDER_CONNECTION_EDGE_TYPE
>;

export type LadderContextMenuElement =
	{ type: "pane" } | LadderNodeType | LadderConnectionEdgeType;
export type LadderContextMenuProps = {
	element: LadderContextMenuElement;
	position: XYPosition;
};
