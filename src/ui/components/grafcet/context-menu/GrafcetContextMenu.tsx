"use client";

import { getStepVariableId } from "@/project-analyser/analysers/grafcet/grafcet.analyser";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import ContextMenu from "@/ui/lib/context-menu/ContextMenu";
import useBooleanState from "@/ui/lib/hooks/useBooleanState";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { XYPosition } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useClipboardStore } from "@/ui/stores/shared/clipboard.store";
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext";
import {
	GrafcetNodeType,
	JunctionNodeType,
} from "../flow/grafcet-nodes-definitions";
import { ActionNodeType } from "../nodes/ActionNode";
import { StepNodeType } from "../nodes/StepNode";
import actionContextMenuItems from "./action-context-menu-items";
import defaultContextMenuItems from "./default-context-menu-items";
import {
	GrafcetContextMenuElement,
	GrafcetContextMenuProps,
} from "./grafcet-context-menu";
import junctionContextMenuItems from "./junction-context-menu-items";
import paneContextMenuItems from "./pane-context-menu-items";
import stepContextMenuItems from "./step-context-menu-items";
import transitionContextMenuItems from "./transition-context-menu-items";
import { TransitionNodeType } from "../nodes/TransitionNode";

/**
 *
 * @param param0 position : the position in the flow
 * @returns
 */
const GrafcetContextMenu = ({
	flowDimensions,
}: {
	flowDimensions: { width: number; height: number };
}) => {
	const { contextMenuEvents } = useGrafcetContext();
	const [element, setElement] = useState<GrafcetContextMenuElement>({
		type: "pane",
	});
	const [visible, show, hide] = useBooleanState(false);
	const [position, setPosition] = useState<XYPosition>({ x: 0, y: 0 });
	const [screenPosition, setScreenPosition] = useState<XYPosition>({
		x: 0,
		y: 0,
	});
	const viewManager = useGrafcetStore((state) => state.viewManager);
	const workflowManager = useGrafcetStore((state) => state.workflowManager);
	const copyCutPasteManager = useGrafcetStore(
		(state) => state.copyCutPasteManager,
	);
	const canPaste = useClipboardStore((s) => s.entry?.scope === "grafcet");
	const grafcet = useGrafcetStore((state) => state.grafcet);
	const grafcetId = grafcet.id;
	const inSimulation = useProjectStore(
		(state) => state.mode === ProjectMode.SIMULATION,
	);
	const simulationManager = useProjectStore((state) => state.simulationManager);
	const forcedVariables = useProjectStore((state) => state.forcedVariables);

	//Groups of items, the groups will be separated with dividers
	const menuItems: ContextMenuItemType[][] = useMemo(() => {
		const items: ContextMenuItemType[][] = [];
		if (element.type == "pane") {
			items.push(
				...paneContextMenuItems(
					viewManager,
					copyCutPasteManager,
					screenPosition,
					canPaste,
				),
			);
		} else {
			if (element.type === "step") {
				const stepVariableId = getStepVariableId(
					grafcetId,
					(element as StepNodeType).data.number as number,
				);
				items.push(
					...stepContextMenuItems(element as StepNodeType, {
						inSimulation,
						grafcet,
						workflowManager,
						stepVariableId,
						simulationManager,
						forcedVariables,
					}),
				);
			}
			if (element.type === "transition" && !inSimulation) {
				items.push(
					...transitionContextMenuItems(
						element as TransitionNodeType,
						grafcet,
						workflowManager,
					),
				);
			}
			const commonNodeItems = defaultContextMenuItems(
				element as GrafcetNodeType,
				workflowManager,
				copyCutPasteManager,
			);
			if (element.type === "action") {
				items.push(
					...actionContextMenuItems(element as ActionNodeType, workflowManager),
				);
			}
			if (element.type.includes("junction")) {
				items.push(
					...junctionContextMenuItems(
						element as JunctionNodeType,
						contextMenuEvents,
						workflowManager,
					),
				);
			}
			if (!inSimulation) {
				items.push(...commonNodeItems);
			}
		}
		return items;
	}, [
		element,
		viewManager,
		workflowManager,
		copyCutPasteManager,
		canPaste,
		screenPosition,
		contextMenuEvents,
		inSimulation,
		grafcet,
		grafcetId,
		simulationManager,
		forcedVariables,
	]);

	//Show the menu on 'show' event
	useEffect(() => {
		const showMenu = (props: GrafcetContextMenuProps) => {
			setElement(props.element);
			setPosition(props.position);
			setScreenPosition(props.screenPosition);
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
