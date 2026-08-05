"use client";

import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import ContextMenu from "@/ui/lib/context-menu/ContextMenu";
import useBooleanState from "@/ui/lib/hooks/useBooleanState";
import { OnDelete } from "@xyflow/react";
import { XYPosition } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { useLadderContext } from "../context/LadderContext";
import { useLadderStore } from "../context/LadderContext";
import { LadderContextMenuElement, LadderContextMenuProps } from "./ladder-context-menu";
import nodeOrEdgeContextMenuItems from "./node-or-edge-context-menu-items";
import paneContextMenuItems from "./pane-context-menu-items";

const LadderContextMenu = ({
	flowDimensions,
	sectionId,
	handleDelete,
}: {
	flowDimensions: { width: number; height: number };
	sectionId: string;
	handleDelete: OnDelete;
}) => {
	const { contextMenuEvents } = useLadderContext();
	const workflowManager = useLadderStore((state) => state.workflowManager);
	const [element, setElement] = useState<LadderContextMenuElement>({ type: "pane" });
	const [visible, show, hide] = useBooleanState(false);
	const [position, setPosition] = useState<XYPosition>({ x: 0, y: 0 });

	const menuItems: ContextMenuItemType[][] = useMemo(() => {
		if (element.type === "pane") {
			return paneContextMenuItems(workflowManager, sectionId);
		}
		return nodeOrEdgeContextMenuItems(element, handleDelete);
	}, [element, workflowManager, sectionId, handleDelete]);

	useEffect(() => {
		const showMenu = (props: LadderContextMenuProps) => {
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

export default LadderContextMenu;
