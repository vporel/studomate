"use client";

import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import ContextMenu from "@/ui/lib/context-menu/ContextMenu";
import mitt from "mitt";
import { ExplorerContextMenuProps } from "./explorer-context-menu";
import { ExplorerContextMenuEventsOut } from "./explorer-context-menu-events";
import useBlockInstanceMenuItems from "./useBlockInstanceMenuItems";
import useGrafcetMenuItems from "./useGrafcetMenuItems";
import useLadderMenuItems from "./useLadderMenuItems";
import usePaneMenuItems from "./usePaneMenuItems";
import useVariablesMenuItems from "./useVariablesMenuItems";

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
	const ladderMenuItems = useLadderMenuItems();
	const variablesMenuItems = useVariablesMenuItems();
	const blockInstanceMenuItems = useBlockInstanceMenuItems();

	let menuItems: ContextMenuItemType[][] = [];
	if (element.type == "pane") {
		menuItems = paneMenuItems();
	} else if (element.type == "grafcet") {
		menuItems = grafcetMenuItems(element.grafcetId);
	} else if (element.type == "ladder") {
		menuItems = ladderMenuItems(element.ladderId);
	} else if (element.type == "variables") {
		menuItems = variablesMenuItems(element.variablesPageId);
	} else if (element.type == "block-instance") {
		menuItems = blockInstanceMenuItems(element.ladderId, element.elementId);
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
