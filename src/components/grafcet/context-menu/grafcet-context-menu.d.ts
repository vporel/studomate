import { XYPosition } from "@xyflow/react";
import { GrafcetEdge, GrafcetNode } from "../flow/grafcet-nodes-definitions";

export type GrafcetContextMenuElement = { type: "pane" } | GrafcetNode | GrafcetEdge;
export type GrafcetContextMenuProps = { element: GrafcetContextMenuElement; position: XYPosition };

type GrafcetContextMenuItemBaseType = {
	label: string;
	shortcut?: "Ctrl+A";
	onClick?: () => void;
	disabled?: boolean;
};

export type GrafcetcontextMenuItemType = GrafcetContextMenuItemBaseType & {
	subItems?: GrafcetContextMenuItemBaseType[];
};
