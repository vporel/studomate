import { MouseEvent } from "react";
import { CustomTreeItemStyles } from "../mui/CustomTreeItem";
import { ExplorerContextMenuElement } from "./context-menu/explorer-context-menu";

export type ExplorerItemsProps = {
	styles: CustomTreeItemStyles;
	onContextMenu: (
		event: MouseEvent,
		element: ExplorerContextMenuElement,
	) => void;
};
