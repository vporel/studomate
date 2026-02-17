"use client";

import { ContextMenuItemType } from "@/lib/context-menu/context-menu";
import ContextMenu from "@/lib/context-menu/ContextMenu";
import useBooleanState from "@/lib/hooks/useBooleanState";
import { XYPosition } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext";
import { GrafcetNodeType, JunctionNode } from "../flow/grafcet-nodes-definitions";
import commonNodeContextMenuItems from "./common-node-context-menu-items";
import { GrafcetContextMenuElement, GrafcetContextMenuProps } from "./grafcet-context-menu";
import junctionContextMenuItems from "./junction-context-menu-items";
import paneContextMenuItems from "./pane-context-menu-items";

/**
 *
 * @param param0 position : the position in the flow
 * @returns
 */
const GrafcetContextMenu = ({ flowDimensions }: { flowDimensions: { width: number; height: number } }) => {
	const { contextMenuEvents } = useGrafcetContext();
	const [element, setElement] = useState<GrafcetContextMenuElement>({ type: "pane" });
	const [visible, show, hide] = useBooleanState(false);
	const [position, setPosition] = useState<XYPosition>({ x: 0, y: 0 });
	const { addNodes, deleteNodes, getNodes, getEdges, deleteEdges, selectAllEdges, selectAllNodesAndEdges } =
		useGrafcetStore(
			useShallow((state) => ({
				addNodes: state.addNodes,
				deleteNodes: state.deleteNodes,
				getNodes: state.getNodes,
				getEdges: state.getEdges,
				deleteEdges: state.deleteEdges,
				selectAllEdges: state.selectAllEdges,
				selectAllNodesAndEdges: state.selectAllNodesAndEdges,
			})),
		);
	//Groups of items, the groups will be separated with dividers
	const menuItems: ContextMenuItemType[][] = useMemo(() => {
		if (element.type == "pane") {
			return paneContextMenuItems(getNodes, getEdges, {
				selectAllEdges,
				selectAllNodesAndEdges,
			});
		} else {
			const commonNodeItems = commonNodeContextMenuItems(element as GrafcetNodeType, {
				deleteNodes,
				deleteEdges,
			});
			if (element.type.includes("junction")) {
				return [
					...junctionContextMenuItems(element as JunctionNode, contextMenuEvents),
					...commonNodeItems,
				];
			}
			return commonNodeItems;
		}
	}, [
		element,
		getNodes,
		getEdges,
		contextMenuEvents,
		deleteNodes,
		deleteEdges,
		selectAllEdges,
		selectAllNodesAndEdges,
	]);

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
