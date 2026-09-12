"use client";

import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import ContextMenu from "@/ui/lib/context-menu/ContextMenu";
import { HmiContextMenuProps } from "./hmi-context-menu";
import useHmiPaneMenuItems from "./useHmiPaneMenuItems";
import useHmiWidgetMenuItems from "./useHmiWidgetMenuItems";

const HmiContextMenu = ({
	visible,
	element,
	position,
	onClose,
	canvasWidth,
	canvasHeight,
}: HmiContextMenuProps) => {
	const paneMenuItems = useHmiPaneMenuItems();
	const widgetMenuItems = useHmiWidgetMenuItems();

	const menuItems: ContextMenuItemType[][] =
		element.type === "widget" ? widgetMenuItems() : paneMenuItems();

	return (
		<ContextMenu
			visible={visible}
			position={position}
			menuItems={menuItems}
			onClose={onClose}
			parentWidth={canvasWidth}
			parentHeight={canvasHeight}
		/>
	);
};

export default HmiContextMenu;
