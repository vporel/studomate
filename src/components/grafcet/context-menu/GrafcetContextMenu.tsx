"use client";

import { ContextMenuItemType } from "@/lib/context-menu/context-menu";
import ContextMenu from "@/lib/context-menu/ContextMenu";
import useBooleanState from "@/lib/hooks/useBooleanState";
import { useReactFlow, XYPosition } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { useGrafcetContext } from "../context/GrafcetContext";
import { JunctionNode } from "../flow/grafcet-nodes-definitions";
import { GrafcetContextMenuElement, GrafcetContextMenuProps } from "./grafcet-context-menu";
import junctionContextMenuItems from "./junction-context-menu-items";
import paneContextMenuItems from "./pane-context-menu-items";

/**
 *
 * @param param0 position : the position in the flow
 * @returns
 */
const GrafcetContextMenu = () => {
	const { flowDimensions, contextMenuEvents } = useGrafcetContext();
	const [element, setElement] = useState<GrafcetContextMenuElement>({ type: "pane" });
	const [visible, show, hide] = useBooleanState(false);
	const [position, setPosition] = useState<XYPosition>({ x: 0, y: 0 });
	const { getNodes, getEdges } = useReactFlow();
	//Groups of items, the groups will be separated with dividers
	const menuItems: ContextMenuItemType[][] = useMemo(() => {
		const commonNodesItems = [[{ label: "Supprimer", onClick: () => {} }]];

		if (element.type == "pane") {
			return paneContextMenuItems(getNodes, getEdges, contextMenuEvents);
		} else if (element.type.includes("junction")) {
			return [
				...junctionContextMenuItems(element as JunctionNode, contextMenuEvents),
				...commonNodesItems,
			];
		} else {
			return commonNodesItems;
		}
	}, [element, getNodes, getEdges, contextMenuEvents]);

	//Show the menu on 'show' event
	useEffect(() => {
		const showMenu = (props: GrafcetContextMenuProps) => {
			setElement(props.element);
			setPosition(props.position);
			show();
		};
		contextMenuEvents.on("show", showMenu);
		contextMenuEvents.on("hide", hide);
		return () => {
			contextMenuEvents.off("show", showMenu);
			contextMenuEvents.off("hide", hide);
		};
	}, [contextMenuEvents, hide, show]);

	return (
		<ContextMenu
			visible={visible}
			position={position}
			menuItems={menuItems}
			onClose={hide}
			parentWidth={flowDimensions.width}
			parentHeight={flowDimensions.height}
		/>
	);
};

export default GrafcetContextMenu;
