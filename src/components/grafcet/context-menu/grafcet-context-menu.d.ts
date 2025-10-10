import { XYPosition } from "@xyflow/react";
import { GrafcetEdge, GrafcetNode } from "../flow/grafcet-nodes-definitions";

export type GrafcetContextMenuElement = { type: "pane" } | GrafcetNode | GrafcetEdge;
export type GrafcetContextMenuProps = { element: GrafcetContextMenuElement; position: XYPosition };

type GrafcetContextMenuItemBaseType = {
	label: string;
	shortcut?: string;
	onClick?: () => void;
	disabled?: boolean;
};

export type GrafcetContextMenuItemType = GrafcetContextMenuItemBaseType & {
	subItems?: GrafcetContextMenuItemBaseType[];
};
