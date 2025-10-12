"use client";

import { ContextMenuItemType } from "@/lib/context-menu/context-menu";
import ContextMenu from "@/lib/context-menu/ContextMenu";
import mitt from "mitt";
import { ExplorerContextMenuProps } from "./explorer-context-menu";
import { ExplorerContextMenuEventsOut } from "./explorer-context-menu-events";
import useGrafcetMenuItems from "./useGrafcetMenuItems";
import usePaneMenuItems from "./usePaneMenuItems";

export const explorerContextMenuEventsOut = mitt<ExplorerContextMenuEventsOut>();

/**
 *
 * @param param0 position : the position in the flow
 * @returns
 */
const ExplorerContextMenu = ({
	visible,
	element,
	position,
	onClose,
	explorerWidth,
	explorerHeight,
}: ExplorerContextMenuProps) => {
	const paneMenuItems = usePaneMenuItems();
	const grafcetMenuItems = useGrafcetMenuItems();

	let menuItems: ContextMenuItemType[][] = [];
	if (element.type == "pane") {
		menuItems = paneMenuItems();
	} else if (element.type == "grafcet") {
		menuItems = grafcetMenuItems(element.grafcetId);
	}

	return (
		<ContextMenu
			visible={visible}
			position={position}
			menuItems={menuItems}
			onClose={onClose}
			parentWidth={explorerWidth}
			parentHeight={explorerHeight}
		/>
	);
};

export default ExplorerContextMenu;
