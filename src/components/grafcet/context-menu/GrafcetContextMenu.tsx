"use client";

import { useProjectStore } from "@/components/projects/ProjectContext";
import { ContextMenuItemType } from "@/lib/context-menu/context-menu";
import ContextMenu from "@/lib/context-menu/ContextMenu";
import useBooleanState from "@/lib/hooks/useBooleanState";
import { XYPosition } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext";
import { GrafcetNodeType, JunctionNodeType } from "../flow/grafcet-nodes-definitions";
import { ActionNodeType } from "../nodes/ActionNode";
import actionContextMenuItems from "./action-context-menu-items";
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
	const viewManager = useGrafcetStore((state) => state.viewManager);
	const workflowManager = useGrafcetStore((state) => state.workflowManager);
	const getProject = useProjectStore((state) => state.getProject);

	//Groups of items, the groups will be separated with dividers
	const menuItems: ContextMenuItemType[][] = useMemo(() => {
		const items: ContextMenuItemType[][] = [];
		if (element.type == "pane") {
			items.push(...paneContextMenuItems(viewManager));
		} else {
			const commonNodeItems = commonNodeContextMenuItems(element as GrafcetNodeType, workflowManager);
			if (element.type === "action") {
				items.push(
					...actionContextMenuItems(element as ActionNodeType, workflowManager, getProject as any),
				);
			}
			if (element.type.includes("junction")) {
				items.push(...junctionContextMenuItems(element as JunctionNodeType, contextMenuEvents));
			}
			items.push(...commonNodeItems);
		}
		return items;
	}, [element, viewManager, workflowManager, contextMenuEvents, getProject]);

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
