import { XYPosition } from "@xyflow/react";
import {
	GrafcetEdgeType,
	GrafcetNodeType,
} from "../flow/grafcet-nodes-definitions";

export type GrafcetContextMenuElement =
	{ type: "pane" } | GrafcetNodeType | GrafcetEdgeType;
export type GrafcetContextMenuProps = {
	element: GrafcetContextMenuElement;
	position: XYPosition;
	screenPosition: XYPosition;
};
