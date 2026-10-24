"use client";

import { getStepVariableId } from "@/project-analyser/analysers/grafcet/grafcet.analyser";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import ContextMenu from "@/ui/lib/context-menu/ContextMenu";
import useContextMenuBus from "@/ui/lib/context-menu/useContextMenuBus";
import useBooleanState from "@/ui/lib/hooks/useBooleanState";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { XYPosition } from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import trackEvent from "@/ui/services/analytics";
import { useT } from "@/ui/i18n/useT";
import useCanEdit from "@/ui/components/projects/useCanEdit";
import useProjectClipboard from "@/ui/components/projects/useProjectClipboard";
import type { MenuTranslate } from "@/ui/lib/context-menu/context-menu";
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
	const canPaste = useProjectClipboard((s) => s.entry?.scope === "grafcet");
	const grafcet = useGrafcetStore((state) => state.grafcet);
	const grafcetId = grafcet.id;
	const inSimulation = useProjectStore(
		(state) => state.mode === ProjectMode.SIMULATION,
	);
	const canEdit = useCanEdit();
	const pdfExport = useProjectStore((state) => state.capabilities.pdfExport);
	const simulationManager = useProjectStore((state) => state.simulationManager);
	const forcedVariables = useProjectStore((state) => state.forcedVariables);
	const projectName = useProjectStore(
		(state) => state.project?.name ?? "export",
	);

	const tExport = useT("projects.export");
	const onExport = useCallback(() => {
		void import("@/ui/pdf/program-pdf")
			.then(({ exportProgramPdf }) =>
				exportProgramPdf({
					config: { type: "grafcet", program: grafcet },
					filename: `${projectName} - ${grafcet.name}`,
					sectionTitle: tExport("sectionTitleGrafcet", { name: grafcet.name }),
				}),
			)
			.then(() =>
				trackEvent("pdf-exported", { programs: 1, withVariablesTable: false }),
			)
			.catch(() => toast.error(tExport("errorAssembling")));
	}, [grafcet, projectName, tExport]);

	const tMenuRaw = useT("grafcetEditor.menu");
	const tActionTypesRaw = useT("grafcetEditor.actionTypes");
	const tActionModesRaw = useT("grafcetEditor.actionModes");
	const tMenu = useMemo<MenuTranslate>(
		() => (key, values) => tMenuRaw(key as never, values as never),
		[tMenuRaw],
	);
	const tActionTypes = useMemo<MenuTranslate>(
		() => (key) => tActionTypesRaw(key as never),
		[tActionTypesRaw],
	);
	const tActionModes = useMemo<MenuTranslate>(
		() => (key) => tActionModesRaw(key as never),
		[tActionModesRaw],
	);

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
					tMenu,
					pdfExport ? onExport : null,
				),
			);
		} else {
			if (element.type === "step") {
				const stepVariableId = getStepVariableId(
					grafcetId,
					(element as StepNodeType).data.number as number,
				);
				items.push(
					...stepContextMenuItems(element as StepNodeType, tMenu, {
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
						tMenu,
					),
				);
			}
			const commonNodeItems = defaultContextMenuItems(
				element as GrafcetNodeType,
				workflowManager,
				copyCutPasteManager,
				tMenu,
			);
			if (element.type === "action") {
				items.push(
					...actionContextMenuItems(
						element as ActionNodeType,
						grafcet,
						inSimulation,
						workflowManager,
						tMenu,
						tActionTypes,
						tActionModes,
					),
				);
			}
			if (element.type.includes("junction")) {
				items.push(
					...junctionContextMenuItems(
						element as JunctionNodeType,
						contextMenuEvents,
						workflowManager,
						tMenu,
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
		onExport,
		pdfExport,
		inSimulation,
		grafcet,
		grafcetId,
		simulationManager,
		forcedVariables,
		tMenu,
		tActionTypes,
		tActionModes,
	]);

	//Nothing to offer on an element once it can neither be edited nor forced, nor on the pane
	//when there is neither something to paste into nor a file to export.
	const showMenu = useCallback(
		(props: GrafcetContextMenuProps) => {
			const offersSomething =
				props.element.type === "pane"
					? canEdit || pdfExport
					: canEdit || inSimulation;
			if (!offersSomething) return;
			setElement(props.element);
			setPosition(props.position);
			setScreenPosition(props.screenPosition);
			show();
		},
		[show, canEdit, pdfExport, inSimulation],
	);
	useContextMenuBus(contextMenuEvents, showMenu, hide);

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
